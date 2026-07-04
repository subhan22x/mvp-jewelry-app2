import type Stripe from "stripe";
import { prisma } from "@/server/db/client";
import { getBillingPlan, planKeyForPriceId } from "@/src/lib/billing/plans";

const PAYMENT_PROBLEM_STATUSES = new Set(["past_due", "unpaid"]);
const ACCESS_STATUSES = new Set(["active", "trialing"]);

function secondsToDate(value: unknown) {
  return typeof value === "number" ? new Date(value * 1000) : null;
}

function stripeId(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") return value.id;
  return null;
}

function firstSubscriptionPrice(subscription: Stripe.Subscription) {
  const raw = subscription as unknown as {
    items?: { data?: Array<{ price?: { id?: string; product?: unknown } }> };
  };
  return raw.items?.data?.[0]?.price ?? null;
}

export async function syncStripeSubscription(
  subscription: Stripe.Subscription,
  fallbackAccountId?: string | null
) {
  const subscriptionId = subscription.id;
  const customerId = stripeId(subscription.customer);
  const metadata = subscription.metadata ?? {};
  const price = firstSubscriptionPrice(subscription);
  const priceId = price?.id ?? null;
  const productId = stripeId(price?.product);
  const planKey = planKeyForPriceId(priceId) ?? metadata.planKey ?? null;
  const accountIdFromMetadata = metadata.accountId || fallbackAccountId || null;

  const account = accountIdFromMetadata
    ? await prisma.account.findUnique({ where: { id: accountIdFromMetadata } })
    : customerId
      ? await prisma.account.findFirst({
          where: {
            OR: [
              { stripeCustomerId: customerId },
              { stripeSubscriptionId: subscriptionId },
            ],
          },
        })
      : null;

  if (!account) return null;

  const status = subscription.status;
  const now = new Date();
  const billingIssueStartedAt = PAYMENT_PROBLEM_STATUSES.has(status)
    ? account.billingIssueStartedAt ?? now
    : null;
  const trialEndsAt = secondsToDate(subscription.trial_end);
  const currentPeriodEnd = secondsToDate(
    (subscription as unknown as { current_period_end?: number }).current_period_end
  );
  const plan = getBillingPlan(planKey);

  await prisma.$transaction(async tx => {
    await tx.account.update({
      where: { id: account.id },
      data: {
        stripeCustomerId: customerId ?? account.stripeCustomerId,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: status,
        subscriptionPlanKey: plan?.key ?? planKey ?? account.subscriptionPlanKey,
        stripePriceId: priceId,
        stripeProductId: productId,
        subscriptionCurrentPeriodEnd: currentPeriodEnd,
        trialEndsAt,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        billingIssueStartedAt,
        billingUpdatedAt: now,
        hasUsedTrial: account.hasUsedTrial || Boolean(trialEndsAt),
      },
    });

    if (plan && ACCESS_STATUSES.has(status)) {
      await tx.usagePlan.updateMany({
        where: { accountId: account.id, endsAt: null },
        data: { endsAt: now },
      });
      await tx.usagePlan.create({
        data: {
          accountId: account.id,
          planKey: plan.key,
          limitsJson: JSON.stringify(plan.limits),
          startsAt: now,
        },
      });
    }
  });

  return account.id;
}
