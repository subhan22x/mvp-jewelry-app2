import { prisma } from "@/server/db/client";
import { evaluateAccountEntitlement } from "@/src/lib/billing/entitlements";
import { BILLING_PLANS } from "@/src/lib/billing/plans";
import { requireOwnerContext } from "@/src/lib/auth/owner-context";
import { getMonthlyUsageSummary } from "@/src/lib/usage";
import OwnerFrame from "../OwnerFrame";
import AccountPageContent from "./AccountPageContent";

export const dynamic = "force-dynamic";

export default async function OwnerAccountPage({
  searchParams,
}: {
  searchParams?: Promise<{ billing?: string }>;
}) {
  const owner = await requireOwnerContext();
  const [account, usage, params] = await Promise.all([
    prisma.account.findUnique({
      where: { id: owner.accountId },
      select: {
        id: true,
        status: true,
        stripeCustomerId: true,
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
    searchParams ?? Promise.resolve({} as { billing?: string }),
  ]);

  if (!account) throw new Error("Account not found.");

  const billingMessage = params.billing === "success"
    ? "Checkout completed. Stripe will confirm your subscription by webhook."
    : params.billing === "cancelled"
      ? "Checkout was cancelled. Start the Basic trial when you are ready."
      : null;

  return (
    <OwnerFrame active="Account">
      <AccountPageContent
        billingMessage={billingMessage}
        entitlement={evaluateAccountEntitlement(account)}
        activePlanKey={account.subscriptionPlanKey ?? "basic"}
        trialEndsAt={account.trialEndsAt}
        subscriptionCurrentPeriodEnd={account.subscriptionCurrentPeriodEnd}
        stripeCustomerId={account.stripeCustomerId}
        usage={[usage[0], usage[1]]}
        plans={BILLING_PLANS}
      />
    </OwnerFrame>
  );
}
