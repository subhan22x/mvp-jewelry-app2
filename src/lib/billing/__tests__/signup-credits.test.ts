// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ owner: vi.fn(), account: vi.fn(), events: [] as any[], queue: Promise.resolve(), attempts: [] as any[], expire: vi.fn(), failCommit: false }));
vi.mock("@/src/lib/auth/owner-context", () => ({ getOwnerContext: mock.owner }));
vi.mock("@/server/db/client", () => {
  const tx = {
    $executeRaw: vi.fn(),
    account: { findUnique: mock.account },
    result: { findMany: async () => mock.attempts, updateMany: mock.expire },
    resultRevision: { findUnique: async () => mock.attempts[0], updateMany: mock.expire },
    usageEvent: {
      findMany: async () => mock.events,
      create: async ({ data }: any) => { mock.events.push({ ...data }); return data; },
      update: async ({ where, data }: any) => Object.assign(mock.events.find(e => e.id === where.id), data),
    }
  };
  return { prisma: { ...tx, $transaction: (fn: any) => { const task = mock.queue.then(async () => { const result = await fn(tx); if (mock.failCommit) { mock.events = mock.events.filter(e => e.kind === "signup_generation_grant"); throw new Error("Commit failed"); } return result; }); mock.queue = task.then(() => {}, () => {}); return task; } } };
});
import { getSignupCredits, reserveSignupGeneration, withSignupGeneration, observeSignupGeneration, markSignupGenerationSucceeded } from "../signup-credits";
beforeEach(() => {
  mock.events = [{ kind: "signup_generation_grant", quantity: 5 }];
  mock.queue = Promise.resolve();
  mock.attempts = [];
  mock.failCommit = false;
  mock.expire.mockImplementation(async () => { for (const a of mock.attempts) if (a.status === "pending") a.status = "failed"; });
  mock.owner.mockResolvedValue({ accountId: "account", userId: "owner" });
  mock.account.mockResolvedValue({ status: "active", subscriptionStatus: "incomplete", stripeSubscriptionId: null, hasUsedTrial: false });
});
describe("signup Generate credits", () => {
  it("admits exactly five concurrent Generate requests and counts two variants once", async () => {
    const generate = withSignupGeneration(async () => {
      const reserved = await reserveSignupGeneration("account");
      if (reserved) await observeSignupGeneration(Promise.resolve().then(() => {
        markSignupGenerationSucceeded("account"); markSignupGenerationSucceeded("account");
      }));
      return reserved;
    });
    expect((await Promise.all(Array.from({ length: 8 }, () => generate()))).filter(Boolean)).toHaveLength(5);
    expect(await getSignupCredits("account")).toEqual({ granted: 5, remaining: 0, pending: 0 });
  });
  it("refunds entirely failed attempts and invalid submissions", async () => {
    await withSignupGeneration(async () => { await reserveSignupGeneration("account"); await observeSignupGeneration(Promise.resolve()); })();
    await withSignupGeneration(async () => { await reserveSignupGeneration("account"); })();
    expect((await getSignupCredits("account")).remaining).toBe(5);
  });
  it("keeps the final request pending until its task completes", async () => {
    mock.events[0].quantity = 1;
    let finish!: () => void;
    const task = new Promise<void>(resolve => { finish = resolve; });
    let observed!: Promise<unknown>;
    await withSignupGeneration(async () => { await reserveSignupGeneration("account"); observed = observeSignupGeneration(task.then(() => { markSignupGenerationSucceeded("account"); })); })();
    expect(await getSignupCredits("account")).toEqual({ granted: 1, remaining: 0, pending: 1 });
    finish(); await observed;
    expect((await getSignupCredits("account")).pending).toBe(0);
  });
  it("denies anonymous and other-account access", async () => {
    mock.owner.mockResolvedValue(null);
    expect(await withSignupGeneration(() => reserveSignupGeneration("account"))()).toBe(false);
    mock.owner.mockResolvedValue({ accountId: "other" });
    expect(await withSignupGeneration(() => reserveSignupGeneration("account"))()).toBe(false);
  });
  it("never regrants credits without a signup grant or after a subscription", async () => {
    mock.events = [];
    expect(await withSignupGeneration(() => reserveSignupGeneration("account"))()).toBe(false);
    mock.events = [{ kind: "signup_generation_grant", quantity: 5 }];
    mock.account.mockResolvedValue({ status: "active", subscriptionStatus: "canceled", stripeSubscriptionId: "sub_1", hasUsedTrial: true });
    expect(await withSignupGeneration(() => reserveSignupGeneration("account"))()).toBe(false);
  });
  it("recovers credits when a worker saved its results but did not settle", async () => {
    mock.events.push({ id: "credit", kind: "signup_generation", quantity: 1, sourceType: "Request", sourceId: "request", metadataJson: "pending" });
    mock.attempts = [{ status: "failed" }, { status: "succeeded" }];
    expect(await getSignupCredits("account")).toEqual({ granted: 5, remaining: 4, pending: 0 });
  });
  it.each([["pending", 5], ["succeeded", 4]] as const)("recovers a stalled worker with a %s variant", async (status, remaining) => {
    mock.events.push({ id: "credit", kind: "signup_generation", quantity: 1, sourceType: "Request", sourceId: "request", metadataJson: "pending", createdAt: new Date(Date.now() - 16 * 60_000) });
    mock.attempts = [{ status }, { status: "pending" }];
    expect(await getSignupCredits("account")).toEqual({ granted: 5, remaining, pending: 0 });
    expect(mock.expire).toHaveBeenCalled();
  });

  it("preserves a commit failure without settling a nonexistent reservation", async () => {
    mock.failCommit = true;
    await expect(withSignupGeneration(() => reserveSignupGeneration("account"))()).rejects.toThrow("Commit failed");
    expect(mock.events).toHaveLength(1);
  });
  it.each(["SignupGeneration", "Request"])("refunds stale %s reservations without persisted attempts", async sourceType => {
    mock.events.push({ id: "credit", kind: "signup_generation", quantity: 1, sourceType, sourceId: "missing", metadataJson: "pending", createdAt: new Date(Date.now() - 16 * 60_000) });
    expect(await getSignupCredits("account")).toEqual({ granted: 5, remaining: 5, pending: 0 });
  });

});
