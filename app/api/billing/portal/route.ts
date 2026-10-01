import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { getStripe } from "@/src/lib/billing/stripe";
import { billingRedirect, billingUnauthorized, billingActionFailure, BillingActionError } from "@/src/lib/billing/http";

export const dynamic = "force-dynamic";

function appBaseUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_BASE_URL?.trim() || new URL(req.url).origin;
}

export async function POST(req: Request) {
  const owner = await getOwnerContext();
  if (!owner) return billingUnauthorized(req);

  try {
    const account = await prisma.account.findUnique({
      where: { id: owner.accountId },
      select: { stripeCustomerId: true },
    });
    if (!account?.stripeCustomerId) {
      throw new BillingActionError("Start a subscription before opening the billing portal.");
    }

    const stripe = getStripe();
    const baseUrl = appBaseUrl(req);
    const session = await stripe.billingPortal.sessions.create({
      customer: account.stripeCustomerId,
      configuration: process.env.STRIPE_PORTAL_CONFIGURATION?.trim() || undefined,
      return_url: `${baseUrl}/owner/account`,
    });

    return billingRedirect(req, session.url);
  } catch (error) {
    return billingActionFailure(req, error);
  }
}
