import type Stripe from "stripe";
import type { Prisma } from "@prisma/client";
import { getBillingPlan, planKeyForPriceId, planKeyForProductId } from "./plans";

const PAYMENT_PROBLEM_STATUSES = new Set(["past_due", "unpaid"]);
const ACCESS_STATUSES = new Set(["active", "trialing"]);
const TERMINAL_STATUSES = new Set(["canceled", "incomplete_expired"]);

export function stripeId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") return value.id;
  return null;
}

// Caller holds the account lock and records the event in this same transaction.
export async function syncStripeSubscription(
  tx: Prisma.TransactionClient,
  subscription: Stripe.Subscription,
  accountId: string,
) {
  const account = await tx.account.findUnique({ where: { id: accountId } });
  if (!account) throw new Error("Stripe subscription account not found.");
  const customerId = stripeId(subscription.customer);
  if (account.stripeCustomerId && account.stripeCustomerId !== customerId) {
    throw new Error("Stripe customer does not match this account.");
  }
  if (account.stripeSubscriptionId && account.stripeSubscriptionId !== subscription.id) {
    // A delayed cancellation for the previous subscription must not revoke the new one.
    if (TERMINAL_STATUSES.has(subscription.status)) return account.id;
    if (account.subscriptionStatus && !TERMINAL_STATUSES.has(account.subscriptionStatus)) {
      throw new Error("Account already has a different subscription.");
    }
  }

  const item = subscription.items.data[0];
  const price = item?.price;
  const plan = getBillingPlan(planKeyForProductId(stripeId(price?.product)) ?? planKeyForPriceId(price?.id));
  if (!plan && ACCESS_STATUSES.has(subscription.status)) {
    throw new Error("Subscription uses an unrecognized Stripe Price.");
  }
  const now = new Date();
  await tx.account.update({
    where: { id: account.id },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionPlanKey: plan?.key ?? account.subscriptionPlanKey,
      stripePriceId: price?.id ?? null,
      stripeProductId: stripeId(price?.product),
      subscriptionCurrentPeriodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000) : null,
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      billingIssueStartedAt: PAYMENT_PROBLEM_STATUSES.has(subscription.status) ? account.billingIssueStartedAt ?? now : null,
      billingUpdatedAt: now,
      hasUsedTrial: account.hasUsedTrial || Boolean(subscription.trial_start || subscription.trial_end),
    },
  });

  if (plan && ACCESS_STATUSES.has(subscription.status)) {
    const limitsJson = JSON.stringify(plan.limits);
    const currentPlan = await tx.usagePlan.findFirst({ where: { accountId, endsAt: null }, orderBy: { startsAt: "desc" } });
    if (currentPlan?.planKey !== plan.key || currentPlan.limitsJson !== limitsJson) {
      await tx.usagePlan.updateMany({ where: { accountId, endsAt: null }, data: { endsAt: now } });
      await tx.usagePlan.create({ data: { accountId, planKey: plan.key, limitsJson, startsAt: now } });
    }
  }
  return account.id;
}
