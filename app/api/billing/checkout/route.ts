import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { getActiveBillingPlan, priceIdForPlan, TRIAL_DAYS } from "@/src/lib/billing/plans";
import { getStripe } from "@/src/lib/billing/stripe";

export const dynamic = "force-dynamic";

const Body = z.object({
  planKey: z.string().default("basic"),
});

async function parseBody(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return Body.parse(await req.json());
  const form = await req.formData();
  return Body.parse({ planKey: form.get("planKey") ?? "basic" });
}

function appBaseUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_BASE_URL?.trim() || new URL(req.url).origin;
}

export async function POST(req: Request) {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const body = await parseBody(req);
    const plan = getActiveBillingPlan(body.planKey);
    if (!plan) {
      return NextResponse.json({ error: "Only the Basic plan is available for v1." }, { status: 400 });
    }

    const priceId = priceIdForPlan(plan);
    if (!priceId) {
      return NextResponse.json({ error: `${plan.priceEnvVar} is not configured.` }, { status: 500 });
    }

    const account = await prisma.account.findUnique({
      where: { id: owner.accountId },
      select: {
        id: true,
        name: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        hasUsedTrial: true,
      },
    });
    if (!account) return NextResponse.json({ error: "Account not found." }, { status: 404 });

    const stripe = getStripe();
    let customerId = account.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: owner.email ?? undefined,
        name: account.name,
        metadata: { accountId: account.id },
      });
      customerId = customer.id;
      await prisma.account.update({
        where: { id: account.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const baseUrl = appBaseUrl(req);
    const trialDays = account.hasUsedTrial ? undefined : TRIAL_DAYS;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/owner/account?billing=success`,
      cancel_url: `${baseUrl}/owner/account?billing=cancelled`,
      payment_method_collection: "always",
      allow_promotion_codes: true,
      metadata: {
        accountId: account.id,
        planKey: plan.key,
      },
      subscription_data: {
        ...(trialDays ? { trial_period_days: trialDays } : {}),
        metadata: {
          accountId: account.id,
          planKey: plan.key,
        },
      },
    });

    if (!session.url) return NextResponse.json({ error: "Stripe did not return a Checkout URL." }, { status: 500 });
    return NextResponse.redirect(session.url, { status: 303 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start checkout.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
