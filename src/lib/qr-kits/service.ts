import { prisma } from "@/server/db/client";
import { evaluateAccountEntitlement } from "@/src/lib/billing/entitlements";
import { createQrKitPublicToken, normalizeBatchCode, qrKitDisplayCode } from "./codes";
import { QrKitAttributionError, type QrKitStatus } from "./types";

export { QrKitAttributionError } from "./types";

const MAX_BATCH_SIZE = 100;
const MAX_STORED_QR_KITS = 12;
export const QR_KIT_COOKIE = "gj_qr_kits";

export async function createQrKitBatch(input: {
  code: string;
  label: string;
  printTemplateVersion: string;
  quantity: number;
  actorUserId: string;
}) {
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > MAX_BATCH_SIZE) {
    throw new Error(`Quantity must be between 1 and ${MAX_BATCH_SIZE}.`);
  }

  const code = normalizeBatchCode(input.code);
  const label = input.label.trim();
  const printTemplateVersion = input.printTemplateVersion.trim();
  if (!label || !printTemplateVersion) throw new Error("Batch label and print template version are required.");

  return prisma.$transaction(async tx => {
    const batch = await tx.qrKitBatch.create({
      data: { code, label, printTemplateVersion, createdByUserId: input.actorUserId }
    });

    const kits = [];
    for (let ordinal = 1; ordinal <= input.quantity; ordinal += 1) {
      const kit = await tx.qrKit.create({
        data: {
          batchId: batch.id,
          displayCode: qrKitDisplayCode(code, ordinal),
          publicToken: createQrKitPublicToken(),
          events: { create: { type: "created", actorUserId: input.actorUserId } }
        }
      });
      kits.push(kit);
    }

    return { batch, kits };
  });
}

export async function assignQrKit(input: { qrKitId: string; accountId: string; actorUserId: string }) {
  return prisma.$transaction(async tx => {
    const account = await tx.account.findUnique({ where: { id: input.accountId }, select: { id: true, status: true } });
    if (!account || account.status !== "active") throw new Error("Choose an active Account.");

    const updated = await tx.qrKit.updateMany({
      where: { id: input.qrKitId, status: "available", accountId: null },
      data: { status: "assigned", accountId: account.id, assignedAt: new Date() }
    });
    if (updated.count !== 1) throw new Error("This QR kit is no longer available for assignment.");

    await tx.qrKitEvent.create({
      data: { qrKitId: input.qrKitId, accountId: account.id, actorUserId: input.actorUserId, type: "assigned" }
    });

    return tx.qrKit.findUniqueOrThrow({ where: { id: input.qrKitId } });
  });
}

export async function changeQrKitStatus(input: {
  qrKitId: string;
  status: Extract<QrKitStatus, "suspended" | "lost" | "retired">;
  actorUserId: string;
  reason?: string;
}) {
  return prisma.$transaction(async tx => {
    const kit = await tx.qrKit.findUnique({ where: { id: input.qrKitId } });
    if (!kit || !kit.accountId || !["assigned", "suspended"].includes(kit.status)) {
      throw new Error("Only assigned QR kits can be updated.");
    }

    const type = input.status === "lost" ? "marked_lost" : input.status;
    const updated = await tx.qrKit.updateMany({
      where: { id: kit.id, status: kit.status },
      data: { status: input.status }
    });
    if (updated.count !== 1) throw new Error("This QR kit changed before the update could be applied.");

    await tx.qrKitEvent.create({
      data: { qrKitId: kit.id, accountId: kit.accountId, actorUserId: input.actorUserId, type, reason: input.reason?.trim() || null }
    });
    return tx.qrKit.findUniqueOrThrow({ where: { id: kit.id } });
  });
}

export async function resolveQrKitAttribution(accountSlug: string, publicToken: string | null | undefined) {
  if (!publicToken) return { qrKitId: null };

  const kit = await prisma.qrKit.findUnique({
    where: { publicToken },
    select: {
      id: true,
      status: true,
      account: {
        select: {
          id: true,
          slug: true,
          status: true,
          subscriptionStatus: true,
          subscriptionPlanKey: true,
          trialEndsAt: true,
          subscriptionCurrentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          billingIssueStartedAt: true,
          StoreProfile: { select: { isPublished: true } }
        }
      }
    }
  });

  if (!kit || !kit.account) throw new QrKitAttributionError("QR kit was not found.", 404);
  if (kit.status === "suspended" || kit.status === "lost" || kit.status === "retired") {
    throw new QrKitAttributionError("QR kit is no longer active.", 410);
  }
  if (kit.status !== "assigned" || kit.account.slug !== accountSlug) {
    throw new QrKitAttributionError("QR kit does not belong to this Account.", 403);
  }
  if (kit.account.status !== "active" || !kit.account.StoreProfile?.isPublished || !evaluateAccountEntitlement(kit.account).canPublishStorefront) {
    throw new QrKitAttributionError("This store is not available.", 403);
  }

  return { qrKitId: kit.id };
}

function cookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  const encodedName = `${name}=`;
  for (const segment of cookieHeader.split(";")) {
    const value = segment.trim();
    if (!value.startsWith(encodedName)) continue;
    try {
      return decodeURIComponent(value.slice(encodedName.length));
    } catch {
      return null;
    }
  }
  return null;
}

function qrKitCookieEntries(cookieHeader: string | null): Record<string, string> {
  const encoded = cookieValue(cookieHeader, QR_KIT_COOKIE);
  if (!encoded) return {};
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const entries: Array<[string, string]> = [];
    for (const [slug, token] of Object.entries(parsed)) {
      if (/^[a-z0-9-]{1,80}$/i.test(slug) && typeof token === "string" && /^[A-Za-z0-9_-]{32}$/.test(token)) {
        entries.push([slug, token]);
      }
    }
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

export function nextQrKitCookieValue(cookieHeader: string | null, accountSlug: string, publicToken: string) {
  const existing = qrKitCookieEntries(cookieHeader);
  delete existing[accountSlug];
  const entries = [...Object.entries(existing), [accountSlug, publicToken]].slice(-MAX_STORED_QR_KITS);
  return Buffer.from(JSON.stringify(Object.fromEntries(entries))).toString("base64url");
}

export async function resolveQrKitAttributionFromRequest(req: Request, accountSlug: string | null | undefined) {
  if (!accountSlug) return { qrKitId: null };
  return resolveQrKitAttribution(accountSlug, qrKitCookieEntries(req.headers.get("cookie"))[accountSlug]);
}

export async function resolvePublicQrKit(publicToken: string) {
  const kit = await prisma.qrKit.findUnique({
    where: { publicToken },
    select: { status: true, account: { select: { slug: true } } }
  });
  if (!kit || !kit.account || kit.status !== "assigned") return null;
  return kit.account.slug;
}
