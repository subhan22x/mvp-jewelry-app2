import { describe, expect, it } from "vitest";
import { evaluateAccountEntitlement, type AccountBillingSnapshot } from "./entitlements";

const expiredTrialAccount: AccountBillingSnapshot = {
  id: "dev-account",
  status: "active",
  subscriptionStatus: "canceled",
  subscriptionPlanKey: null,
  trialEndsAt: new Date("2026-07-09T00:00:00Z"),
  subscriptionCurrentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  billingIssueStartedAt: null,
};

describe("evaluateAccountEntitlement", () => {
  const now = new Date("2026-10-02T12:00:00Z");

  it("grants complimentary access without changing an expired account's billing state", () => {
    const entitlement = evaluateAccountEntitlement({
      ...expiredTrialAccount,
      AccessExceptions: [{ id: "grant-1", revokedAt: null, expiresAt: null }],
    }, now);

    expect(entitlement).toMatchObject({
      canUsePaidFeatures: true,
      canPublishStorefront: true,
      hasComplimentaryAccess: true,
      statusLabel: "Complimentary access",
    });
  });

  it("does not honor revoked or expired exceptions", () => {
    for (const exception of [
      { id: "revoked", revokedAt: now, expiresAt: null },
      { id: "expired", revokedAt: null, expiresAt: new Date("2026-10-02T11:59:59Z") },
    ]) {
      const entitlement = evaluateAccountEntitlement({ ...expiredTrialAccount, AccessExceptions: [exception] }, now);
      expect(entitlement.canUsePaidFeatures).toBe(false);
      expect(entitlement.hasComplimentaryAccess).toBe(false);
    }
  });

  it("does not allow an exception to override a disabled account", () => {
    const entitlement = evaluateAccountEntitlement({
      ...expiredTrialAccount,
      status: "disabled",
      AccessExceptions: [{ id: "grant-1", revokedAt: null, expiresAt: null }],
    }, now);

    expect(entitlement.canUsePaidFeatures).toBe(false);
    expect(entitlement.canPublishStorefront).toBe(false);
  });
});
