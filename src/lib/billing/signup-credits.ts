import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { AccountBillingSnapshot } from "./entitlements";
import { prisma } from "@/server/db/client";

export const SIGNUP_GENERATIONS = 5;
const STALLED_GENERATION_MS = 15 * 60_000; // Beyond the 300-second route budget and normal provider timeout.
const GRANT = "signup_generation_grant";
const CREDIT = "signup_generation";
const PENDING = JSON.stringify({ status: "pending" });
const SUCCEEDED = JSON.stringify({ status: "succeeded" });
const REFUNDED = JSON.stringify({ status: "refunded" });
const isPending = (event: { metadataJson: string | null }) => event.metadataJson === PENDING || event.metadataJson === "pending";
type GenerationContext = { reservation?: string; accountId?: string; userId?: string; scheduled: boolean; succeeded: boolean };
const context = new AsyncLocalStorage<GenerationContext>();
let ownerModule: Promise<typeof import("@/src/lib/auth/owner-context")> | undefined;

export function isSignupCreditAccount(account: Pick<AccountBillingSnapshot, "status" | "subscriptionStatus" | "stripeSubscriptionId" | "hasUsedTrial"> | null) {
  return Boolean(account && account.status === "active" && account.subscriptionStatus === "incomplete" && !account.stripeSubscriptionId && !account.hasUsedTrial);
}

export async function getSignupCredits(accountId: string) {
  const events = await prisma.usageEvent.findMany({ where: { accountId, kind: { in: [GRANT, CREDIT] } } });
  // Recover settlement if the worker saved results but stopped before finalizing the credit.
  for (const event of events.filter(e => e.kind === CREDIT && isPending(e))) {
    const stalled = event.createdAt && event.createdAt.getTime() < Date.now() - STALLED_GENERATION_MS;
    if (event.sourceType === "SignupGeneration") {
      // No worker has started before binding. Recover an interrupted setup reservation.
      if (stalled) {
        await prisma.usageEvent.update({ where: { id: event.id }, data: { quantity: 0, metadataJson: REFUNDED } });
        event.quantity = 0;
        event.metadataJson = REFUNDED;
      }
      continue;
    }
    if (stalled) {
      const data = { status: "failed", error: "Generation was interrupted. Please try again.", completedAt: new Date() };
      if (event.sourceType === "ResultRevision") {
        await prisma.resultRevision.updateMany({ where: { id: event.sourceId, accountId, status: "pending" }, data });
      } else {
        await prisma.result.updateMany({ where: { requestId: event.sourceId, accountId, status: "pending" }, data });
      }
    }
    const attempts = event.sourceType === "ResultRevision"
      ? [await prisma.resultRevision.findUnique({ where: { id: event.sourceId }, select: { status: true } })].filter(Boolean)
      : await prisma.result.findMany({ where: { requestId: event.sourceId }, select: { status: true } });
    if (!attempts.length) {
      if (stalled) {
        await prisma.usageEvent.update({ where: { id: event.id }, data: { quantity: 0, metadataJson: REFUNDED } });
        event.quantity = 0;
        event.metadataJson = REFUNDED;
      }
      continue;
    }
    if (attempts.some(a => a?.status === "pending")) continue;
    const succeeded = attempts.some(a => a?.status === "succeeded");
    await prisma.usageEvent.update({ where: { id: event.id }, data: { quantity: succeeded ? 1 : 0, metadataJson: succeeded ? SUCCEEDED : REFUNDED } });
    event.quantity = succeeded ? 1 : 0;
    event.metadataJson = succeeded ? SUCCEEDED : REFUNDED;
  }
  const granted = events.find(e => e.kind === GRANT)?.quantity ?? 0;
  const used = events.filter(e => e.kind === CREDIT).reduce((sum, e) => sum + e.quantity, 0);
  const pending = events.filter(e => e.kind === CREDIT && e.quantity > 0 && isPending(e)).length;
  return { granted, remaining: Math.max(0, granted - used), pending };
}

export async function reserveSignupGeneration(accountId: string) {
  const scope = context.getStore();
  if (!scope) return false;
  const { getOwnerContext } = await (ownerModule ??= import("@/src/lib/auth/owner-context"));
  const owner = await getOwnerContext();
  if (!scope || owner?.accountId !== accountId) return false;
  if (scope.reservation) return true;
  const reservation = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`signup:${accountId}`}, 0))`;
    const account = await tx.account.findUnique({ where: { id: accountId }, select: { status: true, subscriptionStatus: true, stripeSubscriptionId: true, hasUsedTrial: true } });
    if (!isSignupCreditAccount(account)) return false;
    const events = await tx.usageEvent.findMany({ where: { accountId, kind: { in: [GRANT, CREDIT] } } });
    const granted = events.find(e => e.kind === GRANT)?.quantity ?? 0;
    const used = events.filter(e => e.kind === CREDIT).reduce((sum, e) => sum + e.quantity, 0);
    if (granted <= used) return false;
    const id = randomUUID();
    await tx.usageEvent.create({ data: { id, accountId, kind: CREDIT, quantity: 1, sourceType: "SignupGeneration", sourceId: id, idempotencyKey: id, metadataJson: PENDING } });
    return id;
  });
  if (!reservation) return false;
  scope.reservation = reservation;
  scope.accountId = accountId;
  scope.userId = owner.userId;
  return true;
}

export async function bindSignupGeneration(sourceId: string, sourceType = "Request") {
  const scope = context.getStore();
  if (scope?.reservation) await prisma.usageEvent.update({ where: { id: scope.reservation }, data: { sourceId, sourceType } });
}

export function signupGenerationUserId(fallback: string) { return context.getStore()?.userId ?? fallback; }

export function isSignupGeneration(accountId: string) {
  return context.getStore()?.accountId === accountId;
}

export function markSignupGenerationSucceeded(accountId: string) {
  const scope = context.getStore();
  if (scope?.accountId === accountId) { scope.succeeded = true; return true; }
  return false;
}

async function settle(scope: GenerationContext) {
  if (!scope.reservation) return;
  await prisma.usageEvent.update({ where: { id: scope.reservation }, data: { quantity: scope.succeeded ? 1 : 0, metadataJson: scope.succeeded ? SUCCEEDED : REFUNDED } });
}

export function observeSignupGeneration(task: Promise<unknown>) {
  const scope = context.getStore();
  if (!scope?.reservation) return task;
  scope.scheduled = true;
  return task.finally(() => settle(scope));
}

export function withSignupGeneration<Args extends unknown[], T>(handler: (...args: Args) => Promise<T>) {
  return (...args: Args) => context.run({ scheduled: false, succeeded: false }, async () => {
    const scope = context.getStore()!;
    try { return await handler(...args); }
    finally { if (!scope.scheduled) await settle(scope); }
  });
}
