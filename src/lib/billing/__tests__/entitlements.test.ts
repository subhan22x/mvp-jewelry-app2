import { describe, expect, it, vi } from "vitest";
vi.mock("@/server/db/client", () => ({ prisma: {} }));
import { evaluateAccountEntitlement, type AccountBillingSnapshot } from "../entitlements";
const now = new Date("2026-09-30T12:00:00Z");
const account: AccountBillingSnapshot = {
  id: "acct", status: "active", subscriptionStatus: "active", subscriptionPlanKey: "basic",
  trialEndsAt: null, subscriptionCurrentPeriodEnd: null, cancelAtPeriodEnd: false, billingIssueStartedAt: null,
};
describe("billing access boundaries", () => {
  it("preserves existing stores without subscription state while blocking new incomplete accounts", () => {
    expect(evaluateAccountEntitlement({ ...account, subscriptionStatus: null }, now)).toMatchObject({ canUsePaidFeatures: true, isLegacyActive: true });
    expect(evaluateAccountEntitlement({ ...account, subscriptionStatus: "incomplete" }, now)).toMatchObject({ canUsePaidFeatures: false, canPublishStorefront: false });
  });
  it.each(["canceled", "incomplete", "incomplete_expired", "paused", "unpaid"])("blocks %s", subscriptionStatus => {
    expect(evaluateAccountEntitlement({ ...account, subscriptionStatus }, now).canUsePaidFeatures).toBe(false);
  });
  it.each([null, new Date("2026-09-29T12:00:00Z"), now])("blocks trialing without a future trial end (%s)", trialEndsAt => {
    const result = evaluateAccountEntitlement({ ...account, subscriptionStatus: "trialing", trialEndsAt }, now);
    expect(result.canUsePaidFeatures).toBe(false);
    expect(result.canPublishStorefront).toBe(false);
  });
  it("allows a current trial", () => {
    expect(evaluateAccountEntitlement({ ...account, subscriptionStatus: "trialing", trialEndsAt: new Date("2026-10-01") }, now).isInTrial).toBe(true);
  });
  it("ends payment grace at exactly two days", () => {
    const billingIssueStartedAt = new Date("2026-09-28T12:00:00Z");
    const failed = { ...account, subscriptionStatus: "past_due", billingIssueStartedAt };
    expect(evaluateAccountEntitlement(failed, new Date(now.getTime() - 1)).isInPaymentGrace).toBe(true);
    expect(evaluateAccountEntitlement(failed, now).canUsePaidFeatures).toBe(false);
  });
  it("allows period-end cancellation until Stripe ends the subscription", () => {
    expect(evaluateAccountEntitlement({ ...account, cancelAtPeriodEnd: true }, now)).toMatchObject({ canUsePaidFeatures: true, statusLabel: "Cancels at period end" });
  });
  it("never grants a disabled account access", () => {
    expect(evaluateAccountEntitlement({ ...account, status: "disabled" }, now).canUsePaidFeatures).toBe(false);
  });
});
