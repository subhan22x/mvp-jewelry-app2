import { PrismaClient } from "@prisma/client";
import { loadEnvLocal } from "./env-local.mjs";

Object.assign(process.env, loadEnvLocal());

const prisma = new PrismaClient();
const sourceSlug = process.env.SOURCE_ACCOUNT_SLUG?.trim() || "demo";
const targetSlug = process.env.TARGET_ACCOUNT_SLUG?.trim() || process.env.DEV_OWNER_ACCOUNT_SLUG?.trim() || "dev";
const shouldApply = process.env.APPLY_ACCOUNT_TRANSFER === "1";

const scopedModels = [
  ["requests", "request"],
  ["results", "result"],
  ["result revisions", "resultRevision"],
  ["leads", "lead"],
  ["videos", "videoGeneration"],
  ["quotes", "quoteRequest"],
  ["store services", "storeService"],
  ["products", "product"],
  ["reviews", "storeReview"],
  ["VVS shoots", "vvsStudioShoot"],
  ["VVS uploads", "vvsStudioUpload"],
  ["VVS image generations", "vvsStudioImageGeneration"],
  ["VVS video generations", "vvsStudioVideoGeneration"]
];

async function accountCounts(accountId) {
  const entries = await Promise.all(
    scopedModels.map(async ([label, model]) => [label, await prisma[model].count({ where: { accountId } })])
  );
  return Object.fromEntries(entries);
}

try {
  const [source, target] = await Promise.all([
    prisma.account.findUnique({ where: { slug: sourceSlug } }),
    prisma.account.findUnique({
      where: { slug: targetSlug },
      include: {
        Memberships: {
          where: { status: "active" },
          include: { user: { select: { email: true, authUserId: true } } }
        }
      }
    })
  ]);

  if (!source) throw new Error(`Source account "${sourceSlug}" was not found.`);
  if (!target) throw new Error(`Target account "${targetSlug}" was not found.`);
  if (source.id === target.id) throw new Error("Source and target account are the same.");
  if (!target.Memberships.some(membership => membership.user.authUserId)) {
    throw new Error(`Target account "${targetSlug}" does not have an active Supabase-linked owner.`);
  }

  const [sourceCounts, targetCounts, targetProducts, targetCollections, sourceSettings] = await Promise.all([
    accountCounts(source.id),
    accountCounts(target.id),
    prisma.product.count({ where: { accountId: target.id } }),
    prisma.productCollection.findMany({
      where: { accountId: target.id },
      select: { id: true, _count: { select: { Products: true } } }
    }),
    prisma.appSetting.findMany({ where: { accountId: source.id } })
  ]);

  console.log(`Source: ${source.slug} (${source.id})`);
  console.log(`Target: ${target.slug} (${target.id})`);
  console.log("Source counts:", sourceCounts);
  console.log("Target counts:", targetCounts);

  if (!shouldApply) {
    console.log("Dry run only. Re-run with APPLY_ACCOUNT_TRANSFER=1 to transfer the rows.");
    process.exit(0);
  }

  if (targetProducts > 0 || targetCollections.some(collection => collection._count.Products > 0)) {
    throw new Error("Target account already has products. Merge those manually before transferring demo storefront collections.");
  }

  await prisma.$transaction(async tx => {
    const sourceProfile = await tx.storeProfile.findUnique({ where: { accountId: source.id } });
    if (sourceProfile) {
      await tx.storeProfile.deleteMany({ where: { accountId: target.id } });
      await tx.storeProfile.update({
        where: { accountId: source.id },
        data: { accountId: target.id, isPublished: true }
      });
    }

    await tx.productCollection.deleteMany({ where: { accountId: target.id } });
    await tx.productCollection.updateMany({ where: { accountId: source.id }, data: { accountId: target.id } });

    for (const [, model] of scopedModels) {
      await tx[model].updateMany({ where: { accountId: source.id }, data: { accountId: target.id } });
    }

    for (const setting of sourceSettings) {
      if (setting.key === "name_prompt_mode" || setting.key === `${source.id}:name_prompt_mode`) {
        await tx.appSetting.upsert({
          where: { key: `${target.id}:name_prompt_mode` },
          update: { accountId: target.id, value: setting.value },
          create: { key: `${target.id}:name_prompt_mode`, accountId: target.id, value: setting.value }
        });
        await tx.appSetting.delete({ where: { key: setting.key } });
      } else {
        await tx.appSetting.update({ where: { key: setting.key }, data: { accountId: target.id } });
      }
    }

    await tx.account.update({
      where: { id: target.id },
      data: {
        logoUrl: source.logoUrl,
        themeKey: source.themeKey,
        status: "active"
      }
    });
  });

  const [finalSourceCounts, finalTargetCounts, finalSourceSettings, finalTargetSettings] = await Promise.all([
    accountCounts(source.id),
    accountCounts(target.id),
    prisma.appSetting.findMany({ where: { accountId: source.id }, select: { key: true, value: true } }),
    prisma.appSetting.findMany({ where: { accountId: target.id }, select: { key: true, value: true } })
  ]);

  console.log("Transferred demo-owned data into the authenticated development account.");
  console.log("Remaining source counts:", finalSourceCounts);
  console.log("Final target counts:", finalTargetCounts);
  console.log("Remaining source settings:", finalSourceSettings);
  console.log("Final target settings:", finalTargetSettings);
  console.log(`Set DEFAULT_ACCOUNT_ID=${target.id} locally so new customer generations continue under this owner.`);
} finally {
  await prisma.$disconnect();
}
