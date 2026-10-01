import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/server/db/client";
import { stripeId, syncStripeSubscription } from "@/src/lib/billing/sync";
import { lockBillingAccount } from "@/src/lib/billing/checkout";
import { getStripe, requireStripeWebhookSecret } from "@/src/lib/billing/stripe";

export const dynamic = "force-dynamic";

function subscriptionForEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return { id: stripeId(event.data.object.subscription), accountId: event.data.object.metadata?.accountId, customerId: stripeId(event.data.object.customer) };
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
    case "customer.subscription.trial_will_end":
      return { id: event.data.object.id, accountId: event.data.object.metadata?.accountId, customerId: stripeId(event.data.object.customer) };
    case "invoice.paid":
    case "invoice.payment_failed":
    case "invoice.payment_action_required":
      return { id: stripeId(event.data.object.parent?.subscription_details?.subscription), accountId: null, customerId: stripeId(event.data.object.customer) };
    default:
      return null;
  }
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });

  let stripe: Stripe;
  try {
    stripe = getStripe();
    requireStripeWebhookSecret();
  } catch {
    return NextResponse.json({ error: "Billing webhook is not configured." }, { status: 503 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, requireStripeWebhookSecret());
  } catch {
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  const target = subscriptionForEvent(event);
  if (!target?.id) return NextResponse.json({ received: true, processed: false });

  try {
    const account = target.accountId
      ? await prisma.account.findUnique({ where: { id: target.accountId }, select: { id: true } })
      : await prisma.account.findFirst({
          where: { OR: [
            { stripeSubscriptionId: target.id },
            ...(target.customerId ? [{ stripeCustomerId: target.customerId }] : []),
          ] }, select: { id: true },
        });
    // Only process subscriptions created for this application. Unknown explicit
    // metadata indicates a persistence/setup problem and needs a retry.
    if (!account) {
      if (target.accountId) throw new Error("Stripe event refers to a missing account.");
      return NextResponse.json({ received: true, processed: false });
    }

    const processed = await prisma.$transaction(async tx => {
      await lockBillingAccount(tx, account.id);
      if (await tx.stripeWebhookEvent.findUnique({ where: { stripeEventId: event.id } })) return false;
      // Fetch under the lock, rather than trusting an unordered event snapshot.
      const subscription = await stripe.subscriptions.retrieve(target.id!);
      await syncStripeSubscription(tx, subscription, account.id);
      // Event completion and entitlement changes commit or roll back together.
      await tx.stripeWebhookEvent.create({ data: {
        stripeEventId: event.id,
        type: event.type,
        accountId: account.id,
        payloadJson: JSON.stringify(event.data.object),
      } });
      return true;
    }, { maxWait: 10_000, timeout: 30_000 });

    return NextResponse.json({ received: true, processed });
  } catch (error) {
    console.error("Stripe webhook processing failed", { eventId: event.id, type: event.type, error });
    return NextResponse.json({ error: "Unable to process Stripe webhook. Please retry." }, { status: 500 });
  }
}
