import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { syncStripeSubscription } from "@/src/lib/billing/sync";
import { getStripe, requireStripeWebhookSecret } from "@/src/lib/billing/stripe";

export const dynamic = "force-dynamic";

async function recordWebhookEvent({
  stripeEventId,
  type,
  payloadJson,
}: {
  stripeEventId: string;
  type: string;
  payloadJson?: string | null;
}) {
  try {
    await prisma.stripeWebhookEvent.create({
      data: {
        stripeEventId,
        type,
        payloadJson: payloadJson ?? null,
      },
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return false;
    }
    throw error;
  }
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, requireStripeWebhookSecret());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let accountId: string | null = null;
  const payloadJson = JSON.stringify(event.data.object);
  let eventRecorded = false;

  try {
    const shouldProcess = await recordWebhookEvent({
      stripeEventId: event.id,
      type: event.type,
      payloadJson,
    });
    if (!shouldProcess) return NextResponse.json({ received: true, processed: false });
    eventRecorded = true;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        accountId = session.metadata?.accountId ?? null;
        if (accountId && typeof session.customer === "string") {
          await prisma.account.update({
            where: { id: accountId },
            data: { stripeCustomerId: session.customer },
          });
        }
        if (typeof session.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          accountId = await syncStripeSubscription(subscription, accountId);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        accountId = await syncStripeSubscription(event.data.object);
        break;
      }
      default:
        break;
    }

    if (accountId) {
      await prisma.stripeWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: { accountId },
      });
    }

    return NextResponse.json({ received: true, processed: shouldProcess });
  } catch (error) {
    if (eventRecorded) {
      await prisma.stripeWebhookEvent.deleteMany({ where: { stripeEventId: event.id } }).catch(() => {});
    }
    const message = error instanceof Error ? error.message : "Unable to process Stripe webhook.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
