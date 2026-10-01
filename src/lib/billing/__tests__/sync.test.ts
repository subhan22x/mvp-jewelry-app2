import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import type { Prisma } from "@prisma/client";
import { syncStripeSubscription } from "../sync";
const account = { id: "acct", stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_current", subscriptionStatus: "active", subscriptionPlanKey: "basic", billingIssueStartedAt: null, hasUsedTrial: true };
const findUnique = vi.fn(), update = vi.fn(), findPlan = vi.fn(), createPlan = vi.fn(), endPlan = vi.fn();
const tx = { account: { findUnique, update }, usagePlan: { findFirst: findPlan, create: createPlan, updateMany: endPlan } } as unknown as Prisma.TransactionClient;
const subscription = { id: "sub_current", customer: "cus_1", status: "active", trial_end: null, trial_start: null, cancel_at_period_end: false, items: { data: [{ current_period_end: 1793404800, price: { id: "price_old", product: "prod_basic" } }] } } as unknown as Stripe.Subscription;
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("STRIPE_PRODUCT_BASIC", "prod_basic"); findUnique.mockResolvedValue(account); findPlan.mockResolvedValue(null);
});
describe("subscription snapshot", () => {
  it("recognizes grandfathered Prices by Product and reads item-level renewal date", async () => {
    await syncStripeSubscription(tx, subscription, "acct");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ subscriptionPlanKey: "basic", stripePriceId: "price_old", subscriptionCurrentPeriodEnd: new Date(1793404800 * 1000) }) }));
  });
  it("ignores an old subscription cancellation after a replacement", async () => {
    await syncStripeSubscription(tx, { ...subscription, id: "sub_old", status: "canceled" }, "acct");
    expect(update).not.toHaveBeenCalled();
  });
  it("rejects cross-account customer mappings", async () => {
    await expect(syncStripeSubscription(tx, { ...subscription, customer: "cus_other" }, "acct")).rejects.toThrow("does not match");
  });
  it("rejects an active subscription to an unconfigured product", async () => {
    await expect(syncStripeSubscription(tx, { ...subscription, items: { ...subscription.items, data: [{ ...subscription.items.data[0], price: { ...subscription.items.data[0].price, product: "prod_other" } }] } }, "acct")).rejects.toThrow("unrecognized");
  });
  it("keeps the first failed-payment time across subsequent failures", async () => {
    const firstFailure = new Date("2026-09-29");
    findUnique.mockResolvedValue({ ...account, subscriptionStatus: "past_due", billingIssueStartedAt: firstFailure });
    await syncStripeSubscription(tx, { ...subscription, status: "past_due" }, "acct");
    expect(update.mock.calls[0][0].data.billingIssueStartedAt).toEqual(firstFailure);
  });
  it("clears the grace timestamp when payment recovers", async () => {
    findUnique.mockResolvedValue({ ...account, billingIssueStartedAt: new Date("2026-09-29") });
    await syncStripeSubscription(tx, subscription, "acct");
    expect(update.mock.calls[0][0].data.billingIssueStartedAt).toBeNull();
  });
  it("does not create a new usage plan for every subscription update", async () => {
    await syncStripeSubscription(tx, subscription, "acct");
    const plan = createPlan.mock.calls[0][0].data;
    findPlan.mockResolvedValue(plan);
    createPlan.mockClear();
    await syncStripeSubscription(tx, subscription, "acct");
    expect(createPlan).not.toHaveBeenCalled();
  });
});
