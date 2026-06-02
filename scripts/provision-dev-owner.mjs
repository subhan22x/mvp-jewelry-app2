import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./env-local.mjs";

Object.assign(process.env, loadEnvLocal());

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function cleanSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function findAuthUserByEmail(admin, email) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find(user => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 1000) return null;
  }
}

const email = requireEnv("DEV_OWNER_EMAIL").toLowerCase();
const password = process.env.DEV_OWNER_PASSWORD?.trim();
const accountSlug = cleanSlug(process.env.DEV_OWNER_ACCOUNT_SLUG || "dev");
const storeName = process.env.DEV_OWNER_STORE_NAME?.trim() || "Development Store";
const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseSecretKey = requireEnv("SUPABASE_SECRET_KEY");

if (!accountSlug) throw new Error("DEV_OWNER_ACCOUNT_SLUG must contain letters or numbers.");

const admin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

try {
  let authUser = await findAuthUserByEmail(admin, email);
  if (!authUser) {
    if (!password) {
      throw new Error("DEV_OWNER_PASSWORD is required when the Supabase Auth user does not exist yet.");
    }
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (error || !data.user) throw error || new Error("Supabase did not return the created auth user.");
    authUser = data.user;
  } else if (password) {
    const { error } = await admin.auth.admin.updateUserById(authUser.id, { password });
    if (error) throw error;
  }

  const [linkedUser, emailUser] = await Promise.all([
    prisma.user.findUnique({ where: { authUserId: authUser.id } }),
    prisma.user.findUnique({ where: { email } })
  ]);
  if (linkedUser && emailUser && linkedUser.id !== emailUser.id) {
    throw new Error("The Supabase auth identity and application email are linked to different users. Resolve that conflict manually.");
  }

  const account = await prisma.account.upsert({
    where: { slug: accountSlug },
    update: {
      name: storeName,
      status: "active"
    },
    create: {
      id: crypto.randomUUID(),
      name: storeName,
      slug: accountSlug,
      status: "active"
    }
  });

  const user = linkedUser || emailUser
    ? await prisma.user.update({
        where: { id: (linkedUser || emailUser).id },
        data: {
          authUserId: authUser.id,
          email,
          storeName,
          name: (linkedUser || emailUser).name || storeName,
          role: "store_owner"
        }
      })
    : await prisma.user.create({
        data: {
          authUserId: authUser.id,
          email,
          storeName,
          name: storeName,
          role: "store_owner"
        }
      });

  await prisma.accountMembership.upsert({
    where: {
      accountId_userId: {
        accountId: account.id,
        userId: user.id
      }
    },
    update: {
      role: "owner",
      status: "active"
    },
    create: {
      accountId: account.id,
      userId: user.id,
      role: "owner",
      status: "active"
    }
  });

  await prisma.storeProfile.upsert({
    where: { accountId: account.id },
    update: {
      displayName: storeName,
      isPublished: true
    },
    create: {
      accountId: account.id,
      displayName: storeName,
      headline: "Custom jewelry design and quote requests.",
      statusLabel: "Taking Orders",
      verificationLabel: "VVS Verified",
      isPublished: true
    }
  });

  const categories = ["chain", "pendant", "ring", "bracelet", "watch", "grillz", "earrings", "trophy", "other"];
  for (const [sortOrder, slug] of categories.entries()) {
    await prisma.productCollection.upsert({
      where: { accountId_slug: { accountId: account.id, slug } },
      update: { isActive: true, sortOrder },
      create: {
        accountId: account.id,
        title: slug.replace(/\b\w/g, char => char.toUpperCase()),
        slug,
        sortOrder,
        isActive: true
      }
    });
  }

  console.log(`Provisioned development owner: ${email}`);
  console.log(`Login: ${process.env.APP_BASE_URL || "http://localhost:3000"}/login`);
  console.log(`Dashboard: ${process.env.APP_BASE_URL || "http://localhost:3000"}/owner`);
  console.log(`Public profile: ${process.env.APP_BASE_URL || "http://localhost:3000"}/s/${account.slug}`);
} finally {
  await prisma.$disconnect();
}
