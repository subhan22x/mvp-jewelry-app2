import { createHash } from "node:crypto";
import type Stripe from "stripe";
import { prisma } from "@/server/db/client";
import { TRIAL_DAYS, type BillingPlan } from "./plans";
import { getBillingOffer } from "./catalog";
import { BillingActionError } from "./http";

const TERMINAL_STATUSES = new Set(["canceled", "incomplete_expired"]);

// This lock is shared by Checkout and webhook processing, including across servers.
export async function lockBillingAccount(tx: import("@prisma/client").Prisma.TransactionClient, accountId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`billing:${accountId}`}, 0))`;
}

export async function startAccountCheckout({ stripe, accountId, email, plan, expectedPriceId, baseUrl }: {
  stripe: Stripe;
  accountId: string;
  email: string | null;
  plan: BillingPlan;
  expectedPriceId?: string;
  baseUrl: string;
}) {
  const offer = await getBillingOffer(stripe, plan);
  if (expectedPriceId && expectedPriceId !== offer.priceId) {
    throw new BillingActionError("This plan price changed. Refresh the account page before subscribing.", 409);
  }
  const priceId = offer.priceId;

  return prisma.$transaction(async tx => {
    await lockBillingAccount(tx, accountId);
    const account = await tx.account.findUnique({ where: { id: accountId } });
    if (!account || account.status !== "active") throw new BillingActionError("Account is unavailable.", 403);

    let customerId = account.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        name: account.name,
        metadata: { accountId },
      }, { idempotencyKey: `billing-customer:${accountId}` });
      customerId = customer.id;
      await tx.account.update({ where: { id: accountId }, data: { stripeCustomerId: customerId } });
    }

    // Check Stripe itself: a completed Checkout can precede its webhook.
    let hasUsedTrial = account.hasUsedTrial;
    for await (const subscription of stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })) {
      hasUsedTrial ||= Boolean(subscription.trial_start || subscription.trial_end);
      if (!TERMINAL_STATUSES.has(subscription.status)) {
        const portal = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${baseUrl}/owner/account`, configuration: process.env.STRIPE_PORTAL_CONFIGURATION?.trim() || undefined });
        return portal.url;
      }
    }

    // Reuse one session so multiple tabs cannot start independent subscriptions.
    for await (const session of stripe.checkout.sessions.list({ customer: customerId, status: "open", limit: 100 })) {
      if (session.mode !== "subscription" || session.metadata?.accountId !== accountId) continue;
      if (session.metadata.priceId === priceId && session.metadata.trialEligible === String(!hasUsedTrial) && session.url) {
        return session.url;
      }
      await stripe.checkout.sessions.expire(session.id);
    }

    const recent = await stripe.checkout.sessions.list({ customer: customerId, limit: 1 });
    const retryKey = `billing-checkout:${accountId}:${priceId}:${hasUsedTrial}:${recent.data?.[0]?.id ?? "initial"}`;
    const suffix = [...createHash("sha256").update(retryKey).digest().subarray(0, 8)].map(byte => String.fromCharCode(97 + byte % 26)).join("");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      integration_identifier: `growjewelry_basic_${suffix}`,
      customer: customerId,
      client_reference_id: accountId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/owner/account?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/owner/account?billing=cancelled`,
      payment_method_collection: "always",
      allow_promotion_codes: true,
      metadata: { accountId, planKey: plan.key, priceId, trialEligible: String(!hasUsedTrial) },
      subscription_data: {
        ...(!hasUsedTrial ? { trial_period_days: TRIAL_DAYS } : {}),
        metadata: { accountId, planKey: plan.key },
      },
    }, {
      // Bounds retry recovery if Stripe succeeds but the database transaction fails.
      idempotencyKey: retryKey,
    });
    if (!session.url) throw new Error("Stripe did not return a Checkout URL.");
    return session.url;
  }, { maxWait: 10_000, timeout: 30_000 });
}
