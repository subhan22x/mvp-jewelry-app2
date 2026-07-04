import { notFound } from "next/navigation";
import OwnerFrame from "@/app/owner/OwnerFrame";
import AccountPageContent from "@/app/owner/account/AccountPageContent";
import { BILLING_PLANS } from "@/src/lib/billing/plans";

export const dynamic = "force-dynamic";

export default async function AccountPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <OwnerFrame active="Account">
      <AccountPageContent
        entitlement={{
          canUsePaidFeatures: true,
          canPublishStorefront: true,
          isLegacyActive: false,
          isInTrial: true,
          isInPaymentGrace: false,
          statusLabel: "Free Trial",
          planLabel: "Basic",
          message: "Your free trial is active.",
        }}
        activePlanKey="basic"
        trialEndsAt={new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)}
        subscriptionCurrentPeriodEnd={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
        stripeCustomerId="cus_preview"
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
      />
    </OwnerFrame>
  );
}
