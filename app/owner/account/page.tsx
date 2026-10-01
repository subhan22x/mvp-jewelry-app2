import { prisma } from "@/server/db/client";
import { evaluateAccountEntitlement } from "@/src/lib/billing/entitlements";
import { getStripe } from "@/src/lib/billing/stripe";
import { getBillingOffer, getExistingBillingOffer, type BillingOffer } from "@/src/lib/billing/catalog";
import { BILLING_PLANS } from "@/src/lib/billing/plans";
import { requireOwnerContext } from "@/src/lib/auth/owner-context";
import { getMonthlyUsageSummary } from "@/src/lib/usage";
import OwnerFrame from "../OwnerFrame";
import AccountPageContent from "./AccountPageContent";
import BillingReturnStatus from "./BillingReturnStatus";

export const dynamic = "force-dynamic";

export default async function OwnerAccountPage({
  searchParams,
}: {
  searchParams?: Promise<{ billing?: string; session_id?: string }>;
}) {
  const owner = await requireOwnerContext();
  const [account, usage, params] = await Promise.all([
    prisma.account.findUnique({
      where: { id: owner.accountId },
      select: {
        id: true,
        status: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
        hasUsedTrial: true,
        subscriptionStatus: true,
        subscriptionPlanKey: true,
        subscriptionCurrentPeriodEnd: true,
        trialEndsAt: true,
        cancelAtPeriodEnd: true,
        billingIssueStartedAt: true,
      },
    }),
    Promise.all([
      getMonthlyUsageSummary(owner.accountId, "quote_responded"),
      getMonthlyUsageSummary(owner.accountId, "vvs_product_post_generated"),
    ]),
    searchParams ?? Promise.resolve({} as { billing?: string; session_id?: string }),
  ]);

  if (!account) throw new Error("Account not found.");

  let basicOffer: BillingOffer | undefined;
  const canManageSubscription = Boolean(account.stripeSubscriptionId && !["canceled", "incomplete_expired"].includes(account.subscriptionStatus ?? ""));
  try {
    basicOffer = canManageSubscription && account.subscriptionPlanKey === "basic" && account.stripePriceId
      ? await getExistingBillingOffer(getStripe(), BILLING_PLANS[0], account.stripePriceId)
      : await getBillingOffer(getStripe(), BILLING_PLANS[0]);
  } catch {
    // Never advertise a price or allow new Checkout based on a stale fallback.
  }

  const billingMessage = params.billing === "cancelled"
    ? "Checkout was cancelled. You have not started a new subscription."
    : params.billing === "error" ? "Billing could not be opened. Please try again or contact support." : null;

  return (
    <OwnerFrame active="Account">
      {params.billing === "success" && <div className="mx-auto max-w-5xl px-4 pt-6 md:px-6"><BillingReturnStatus sessionId={params.session_id} /></div>}
      <AccountPageContent
        billingMessage={billingMessage}
        entitlement={evaluateAccountEntitlement(account)}
        activePlanKey={account.subscriptionPlanKey ?? "basic"}
        trialEndsAt={account.trialEndsAt}
        subscriptionCurrentPeriodEnd={account.subscriptionCurrentPeriodEnd}
        stripeCustomerId={account.stripeCustomerId}
        hasUsedTrial={account.hasUsedTrial}
        canManageSubscription={canManageSubscription}
        usage={[usage[0], usage[1]]}
        plans={BILLING_PLANS}
        offers={basicOffer ? { basic: basicOffer } : {}}
      />
    </OwnerFrame>
  );
}
