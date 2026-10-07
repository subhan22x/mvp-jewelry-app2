import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";
import { isSupabaseAuthConfigured } from "@/src/lib/supabase/env";
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

  constructor(public reason: Exclude<PublicTenantAccess["status"], "ok">, message?: string) {
    super(message ?? (reason === "access_denied" ? "Storefront access is denied." : "Storefront is not available."));
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
      AccessExceptions: {
        where: {
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { id: true, expiresAt: true, revokedAt: true },
        take: 1,
      },
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
  const owner = isSupabaseAuthConfigured()
    ? await (await import("@/src/lib/auth/owner-context")).getOwnerContext()
    : null;
  if (!slug) {
    if (owner) return owner.accountId;
    if (isSupabaseAuthConfigured()) {
      // A missing membership does not make an authenticated visitor anonymous.
      // Only a genuinely missing session may use DEFAULT_ACCOUNT_ID.
      const supabase = await createClient();
      const { data, error } = await supabase.auth.getUser();
      if (error && !isAuthSessionMissingError(error)) {
        throw new PublicTenantAccessError("access_denied", "Unable to verify your session. Please sign in again.");
      }
      if (data.user) {
        throw new PublicTenantAccessError("access_denied", "Your login has no active Account. Complete account setup or contact support.");
      }
    }
    return null;
  }
  if (owner) {
    const ownedAccount = await prisma.account.findUnique({ where: { id: owner.accountId }, select: { slug: true } });
    if (ownedAccount?.slug === slug) return owner.accountId;
  }
  const access = await resolvePublicTenantAccess(slug);
  if (access.status === "ok") return access.tenant.accountId;
  throw new PublicTenantAccessError(access.status);
}
