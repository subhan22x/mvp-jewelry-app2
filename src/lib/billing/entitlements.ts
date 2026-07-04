import { prisma } from "@/server/db/client";
import { PAYMENT_FAILURE_GRACE_DAYS, getBillingPlan } from "@/src/lib/billing/plans";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);
const PAYMENT_PROBLEM_STATUSES = new Set(["past_due", "unpaid"]);

export type AccountBillingSnapshot = {
  id: string;
  status: string;
  subscriptionStatus: string | null;
  subscriptionPlanKey: string | null;
  trialEndsAt: Date | null;
  subscriptionCurrentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  billingIssueStartedAt: Date | null;
};

export type EntitlementState = {
  canUsePaidFeatures: boolean;
  canPublishStorefront: boolean;
  isLegacyActive: boolean;
  isInTrial: boolean;
  isInPaymentGrace: boolean;
  statusLabel: string;
  planLabel: string;
  message: string;
};

export class BillingEntitlementError extends Error {
  status = 402;
  code = "billing_required";

  constructor(public entitlement: EntitlementState) {
    super(entitlement.message);
  }
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function evaluateAccountEntitlement(
  account: AccountBillingSnapshot,
  now = new Date()
): EntitlementState {
  const plan = getBillingPlan(account.subscriptionPlanKey);
  const planLabel = plan?.label ?? (account.subscriptionPlanKey ? account.subscriptionPlanKey : "No plan");
  const subscriptionStatus = account.subscriptionStatus;
  const isLegacyActive = account.status === "active" && !subscriptionStatus;
  const trialEndsAt = account.trialEndsAt;
  const isInTrial = subscriptionStatus === "trialing" && (!trialEndsAt || trialEndsAt > now);
  const isActiveSubscription = subscriptionStatus ? ACTIVE_SUBSCRIPTION_STATUSES.has(subscriptionStatus) : false;
  const issueGraceEndsAt = account.billingIssueStartedAt ? addDays(account.billingIssueStartedAt, PAYMENT_FAILURE_GRACE_DAYS) : null;
  const isInPaymentGrace = Boolean(
    subscriptionStatus &&
    PAYMENT_PROBLEM_STATUSES.has(subscriptionStatus) &&
    issueGraceEndsAt &&
    issueGraceEndsAt > now
  );

  if (account.status !== "active") {
    return {
      canUsePaidFeatures: false,
      canPublishStorefront: false,
      isLegacyActive: false,
      isInTrial: false,
      isInPaymentGrace: false,
      statusLabel: "Access denied",
      planLabel,
      message: "This account is not active.",
    };
  }

  if (isLegacyActive) {
    return {
      canUsePaidFeatures: true,
      canPublishStorefront: true,
      isLegacyActive: true,
      isInTrial: false,
      isInPaymentGrace: false,
      statusLabel: "Legacy active",
      planLabel: "Legacy",
      message: "This account is active.",
    };
  }

  if (isInTrial) {
    return {
      canUsePaidFeatures: true,
      canPublishStorefront: true,
      isLegacyActive: false,
      isInTrial: true,
      isInPaymentGrace: false,
      statusLabel: "Free Trial",
      planLabel,
      message: "Your free trial is active.",
    };
  }

  if (isActiveSubscription) {
    return {
      canUsePaidFeatures: true,
      canPublishStorefront: true,
      isLegacyActive: false,
      isInTrial: false,
      isInPaymentGrace: false,
      statusLabel: account.cancelAtPeriodEnd ? "Cancels at period end" : "Active",
      planLabel,
      message: account.cancelAtPeriodEnd
        ? "Your subscription remains active until the end of the current billing period."
        : "Your subscription is active.",
    };
  }

  if (isInPaymentGrace) {
    return {
      canUsePaidFeatures: true,
      canPublishStorefront: true,
      isLegacyActive: false,
      isInTrial: false,
      isInPaymentGrace: true,
      statusLabel: "Payment failed",
      planLabel,
      message: "Payment failed. Update your billing method within 2 days to keep access.",
    };
  }

  return {
    canUsePaidFeatures: false,
    canPublishStorefront: false,
    isLegacyActive: false,
    isInTrial: false,
    isInPaymentGrace: false,
    statusLabel: subscriptionStatus === "canceled" ? "Canceled" : "Billing required",
    planLabel,
    message: "Start or restore a subscription to continue.",
  };
}

export async function getAccountBillingSnapshot(accountId: string) {
  return prisma.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      status: true,
      subscriptionStatus: true,
      subscriptionPlanKey: true,
      trialEndsAt: true,
      subscriptionCurrentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      billingIssueStartedAt: true,
    },
  });
}

export async function assertAccountCanUsePaidFeatures(accountId: string) {
  const account = await getAccountBillingSnapshot(accountId);
  if (!account) {
    throw new BillingEntitlementError({
      canUsePaidFeatures: false,
      canPublishStorefront: false,
      isLegacyActive: false,
      isInTrial: false,
      isInPaymentGrace: false,
      statusLabel: "Access denied",
      planLabel: "No plan",
      message: "Account not found.",
    });
  }

  const entitlement = evaluateAccountEntitlement(account);
  if (!entitlement.canUsePaidFeatures) throw new BillingEntitlementError(entitlement);
  return entitlement;
}

export function billingErrorResponse(error: unknown) {
  if (error instanceof BillingEntitlementError) {
    return {
      error: error.message,
      code: error.code,
      statusLabel: error.entitlement.statusLabel,
    };
  }
  return null;
}
