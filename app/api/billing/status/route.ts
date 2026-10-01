import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { evaluateAccountEntitlement } from "@/src/lib/billing/entitlements";
import { getStripe } from "@/src/lib/billing/stripe";
import { stripeId } from "@/src/lib/billing/sync";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  try {
    const account = await prisma.account.findUnique({ where: { id: owner.accountId } });
    if (!account) return NextResponse.json({ error: "Account unavailable." }, { status: 404 });
    const entitlement = evaluateAccountEntitlement(account);
    let ready = entitlement.canUsePaidFeatures && !entitlement.isLegacyActive;
    const sessionId = new URL(req.url).searchParams.get("session_id");
    if (sessionId) {
      if (!/^cs_(test_|live_)?[a-zA-Z0-9_]+$/.test(sessionId) || sessionId.length > 255) {
        return NextResponse.json({ error: "Invalid checkout reference." }, { status: 400 });
      }
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.mode !== "subscription" || session.metadata?.accountId !== owner.accountId ||
          stripeId(session.customer) !== account.stripeCustomerId) {
        return NextResponse.json({ error: "Checkout unavailable." }, { status: 404 });
      }
      ready &&= session.status === "complete" && ["paid", "no_payment_required"].includes(session.payment_status) &&
        stripeId(session.subscription) === account.stripeSubscriptionId;
    }
    // This endpoint only observes webhook-persisted state. A return URL cannot grant access.
    return NextResponse.json({ ready, statusLabel: entitlement.statusLabel }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to confirm billing yet." }, { status: 503 });
  }
}
