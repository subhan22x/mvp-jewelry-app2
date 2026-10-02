import { notFound } from "next/navigation";
import OwnerFrame from "@/app/owner/OwnerFrame";
import AccountPageContent from "@/app/owner/account/AccountPageContent";
import { BILLING_PLANS } from "@/src/lib/billing/plans";
import { evaluateAccountEntitlement } from "@/src/lib/billing/entitlements";
import BillingReturnStatus from "@/app/owner/account/BillingReturnStatus";

export const dynamic = "force-dynamic";

export default async function AccountPreviewPage({ searchParams }: { searchParams?: Promise<{ state?: string; session_id?: string; price_id?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  const state = params?.state ?? "trial";
  const trialEndsAt = state === "trial" ? new Date(Date.now() + 5 * 86400000) : null;
  const newAccount = ["new", "pending"].includes(state);
  const entitlement = evaluateAccountEntitlement({
    id: "preview", status: "active", subscriptionStatus: newAccount ? "incomplete" : state === "trial" ? "trialing" : state === "past_due" ? "past_due" : "canceled",
    subscriptionPlanKey: "basic", trialEndsAt, subscriptionCurrentPeriodEnd: null, cancelAtPeriodEnd: false,
    billingIssueStartedAt: state === "past_due" ? new Date(Date.now() - 3 * 86400000) : null,
  });

  return (
    <OwnerFrame active="Account">
      {state === "pending" && <div className="mx-auto max-w-5xl px-4 pt-6"><BillingReturnStatus sessionId={params?.session_id} /></div>}
      <AccountPageContent
        entitlement={entitlement}
        activePlanKey="basic"
        trialEndsAt={trialEndsAt}
        subscriptionCurrentPeriodEnd={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
        stripeCustomerId={newAccount ? null : "cus_preview"}
        hasUsedTrial={!newAccount}
        canManageSubscription={["trial", "past_due"].includes(state)}
        usage={[
          {
            kind: "quote_responded",
            used: 4,
            included: 150,
          },
          {
            kind: "vvs_product_post_generated",
            used: 3,
            included: 7,
          },
        ]}
        plans={BILLING_PLANS}
        offers={{ basic: {
          priceId: params?.price_id ?? "price_preview", productId: "prod_preview", label: "Basic",
          description: "Grow Jewelry Basic monthly subscription", formattedPrice: "$250.00", intervalLabel: "/month",
        } }}
      />
    </OwnerFrame>
  );
}
