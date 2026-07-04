import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { getStripe } from "@/src/lib/billing/stripe";

export const dynamic = "force-dynamic";

function appBaseUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_BASE_URL?.trim() || new URL(req.url).origin;
}

export async function POST(req: Request) {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const account = await prisma.account.findUnique({
      where: { id: owner.accountId },
      select: { stripeCustomerId: true },
    });
    if (!account?.stripeCustomerId) {
      return NextResponse.json({ error: "Start a subscription before opening the billing portal." }, { status: 400 });
    }

    const stripe = getStripe();
    const baseUrl = appBaseUrl(req);
    const session = await stripe.billingPortal.sessions.create({
      customer: account.stripeCustomerId,
      return_url: `${baseUrl}/owner/account`,
    });

    return NextResponse.redirect(session.url, { status: 303 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to open billing portal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
