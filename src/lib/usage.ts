import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";

export const USAGE_KINDS = [
  "design_image_generated",
  "design_video_generated",
  "design_3d_generated",
  "quote_requested",
  "quote_responded",
  "quote_fulfilled",
  "vvs_video_generated",
  "vvs_product_post_generated",
  "vvs_product_post_fulfilled",
] as const;

export type UsageKind = (typeof USAGE_KINDS)[number];

const DEFAULT_MONTHLY_LIMITS: Record<UsageKind, number> = {
  design_image_generated: 100,
  design_video_generated: 20,
  design_3d_generated: 20,
  quote_requested: 250,
  quote_responded: 250,
  quote_fulfilled: 250,
  vvs_video_generated: 20,
  vvs_product_post_generated: 50,
  vvs_product_post_fulfilled: 50,
};

export class UsageLimitError extends Error {
  status = 402;
  constructor(
    public kind: UsageKind,
    public included: number,
    public used: number
  ) {
    super("Monthly usage limit reached. Upgrade your plan to continue.");
  }
}

function monthWindow(date = new Date()) {
  const periodStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { periodStart, periodEnd };
}

function parseLimits(value: string | null | undefined): Partial<Record<UsageKind, number>> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.fromEntries(
      USAGE_KINDS
        .filter(kind => typeof parsed[kind] === "number")
        .map(kind => [kind, Math.max(0, Math.floor(parsed[kind] as number))])
    ) as Partial<Record<UsageKind, number>>;
  } catch {
    return {};
  }
}

function safeJson(value: unknown) {
  if (value === undefined) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

async function monthlyLimit(accountId: string, kind: UsageKind) {
  if (!("usagePlan" in prisma)) return DEFAULT_MONTHLY_LIMITS[kind];
  const plan = await prisma.usagePlan.findFirst({
    where: {
      accountId,
      startsAt: { lte: new Date() },
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
    },
    orderBy: { startsAt: "desc" },
  });
  return parseLimits(plan?.limitsJson)[kind] ?? DEFAULT_MONTHLY_LIMITS[kind];
}

export async function getMonthlyUsageSummary(accountId: string, kind: UsageKind) {
  const { periodStart, periodEnd } = monthWindow();
  const included = await monthlyLimit(accountId, kind);
  if (!("accountUsageBucket" in prisma)) {
    return { accountId, kind, used: 0, included, periodStart, periodEnd };
  }

  const bucket = await prisma.accountUsageBucket.findUnique({
    where: { accountId_periodStart_kind: { accountId, periodStart, kind } },
    select: { used: true }
  });

  return {
    accountId,
    kind,
    used: bucket?.used ?? 0,
    included,
    periodStart,
    periodEnd
  };
}

export async function ensureUsageAvailable(accountId: string, kind: UsageKind, quantity = 1) {
  if (!("accountUsageBucket" in prisma)) {
    return { accountId, kind, included: DEFAULT_MONTHLY_LIMITS[kind], used: 0 };
  }
  const { periodStart, periodEnd } = monthWindow();
  const included = await monthlyLimit(accountId, kind);
  const bucket = await prisma.accountUsageBucket.upsert({
    where: { accountId_periodStart_kind: { accountId, periodStart, kind } },
    create: { accountId, periodStart, periodEnd, kind, included },
    update: { included },
  });
  if (bucket.used + quantity > bucket.included) {
    throw new UsageLimitError(kind, bucket.included, bucket.used);
  }
  return bucket;
}

export async function consumeUsageCredit({
  accountId,
  kind,
  quantity = 1,
  sourceType,
  sourceId,
  idempotencyKey,
  metadata,
}: {
  accountId: string;
  kind: UsageKind;
  quantity?: number;
  sourceType: string;
  sourceId: string;
  idempotencyKey?: string;
  metadata?: unknown;
}) {
  const key = idempotencyKey ?? `${accountId}:${kind}:${sourceType}:${sourceId}`;
  if (!("usageEvent" in prisma) || !("accountUsageBucket" in prisma)) {
    return {
      id: key,
      accountId,
      kind,
      quantity,
      sourceType,
      sourceId,
      idempotencyKey: key,
      metadataJson: safeJson(metadata),
      createdAt: new Date(),
    };
  }
  const existing = await prisma.usageEvent.findUnique({ where: { idempotencyKey: key } });
  if (existing) return existing;

  const { periodStart, periodEnd } = monthWindow();
  const included = await monthlyLimit(accountId, kind);

  try {
    return await prisma.$transaction(async tx => {
      const current = await tx.accountUsageBucket.upsert({
        where: { accountId_periodStart_kind: { accountId, periodStart, kind } },
        create: { accountId, periodStart, periodEnd, kind, included },
        update: { included },
      });

      if (current.used + quantity > current.included) {
        throw new UsageLimitError(kind, current.included, current.used);
      }

      await tx.accountUsageBucket.update({
        where: { id: current.id },
        data: { used: { increment: quantity } },
      });

      return tx.usageEvent.create({
        data: {
          accountId,
          kind,
          quantity,
          sourceType,
          sourceId,
          idempotencyKey: key,
          metadataJson: safeJson(metadata),
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const event = await prisma.usageEvent.findUnique({ where: { idempotencyKey: key } });
      if (event) return event;
    }
    throw error;
  }
}

export function usageErrorResponse(error: unknown) {
  if (error instanceof UsageLimitError) {
    return {
      error: error.message,
      code: "usage_limit_reached",
      kind: error.kind,
      included: error.included,
      used: error.used,
    };
  }
  return null;
}
