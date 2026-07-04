import { prisma } from "@/server/db/client";
import { evaluateAccountEntitlement } from "@/src/lib/billing/entitlements";

export type PublicTenant = {
  accountId: string;
  accountSlug: string;
  displayName: string;
};

export type PublicTenantAccess =
  | { status: "ok"; tenant: PublicTenant }
  | { status: "not_found" | "not_published" | "access_denied"; accountSlug: string };

export class PublicTenantAccessError extends Error {
  status = 403;

  constructor(public reason: Exclude<PublicTenantAccess["status"], "ok">) {
    super(reason === "access_denied" ? "Storefront access is denied." : "Storefront is not available.");
  }
}

export async function resolvePublicTenantAccess(accountSlug: string): Promise<PublicTenantAccess> {
  const account = await prisma.account.findUnique({
    where: { slug: accountSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      subscriptionStatus: true,
      subscriptionPlanKey: true,
      trialEndsAt: true,
      subscriptionCurrentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      billingIssueStartedAt: true,
      StoreProfile: { select: { displayName: true, isPublished: true } }
    }
  });

  if (!account) return { status: "not_found", accountSlug };
  if (!account.StoreProfile?.isPublished) return { status: "not_published", accountSlug: account.slug };

  const entitlement = evaluateAccountEntitlement(account);
  if (!entitlement.canPublishStorefront) return { status: "access_denied", accountSlug: account.slug };

  return {
    status: "ok",
    tenant: {
      accountId: account.id,
      accountSlug: account.slug,
      displayName: account.StoreProfile.displayName || account.name
    }
  };
}

export async function resolvePublicTenant(accountSlug: string): Promise<PublicTenant | null> {
  const access = await resolvePublicTenantAccess(accountSlug);
  return access.status === "ok" ? access.tenant : null;
}

export async function resolveAccountIdFromSlug(accountSlug: string | null | undefined) {
  const slug = accountSlug?.trim();
  if (!slug) return null;
  const access = await resolvePublicTenantAccess(slug);
  if (access.status === "ok") return access.tenant.accountId;
  throw new PublicTenantAccessError(access.status);
}
