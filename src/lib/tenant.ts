import { prisma } from "@/server/db/client";

export type PublicTenant = {
  accountId: string;
  accountSlug: string;
  displayName: string;
};

export async function resolvePublicTenant(accountSlug: string): Promise<PublicTenant | null> {
  const account = await prisma.account.findUnique({
    where: { slug: accountSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      StoreProfile: { select: { displayName: true, isPublished: true } }
    }
  });

  if (!account || account.status !== "active" || !account.StoreProfile?.isPublished) return null;

  return {
    accountId: account.id,
    accountSlug: account.slug,
    displayName: account.StoreProfile.displayName || account.name
  };
}

export async function resolveAccountIdFromSlug(accountSlug: string | null | undefined) {
  const slug = accountSlug?.trim();
  if (!slug) return null;
  const tenant = await resolvePublicTenant(slug);
  return tenant?.accountId ?? null;
}
