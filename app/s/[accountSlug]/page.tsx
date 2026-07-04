import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/db/client";
import { requirePublicTenantPage } from "@/src/lib/tenant-page";

export const dynamic = "force-dynamic";

type StorefrontPageProps = {
  params: Promise<{
    accountSlug: string;
  }>;
};

async function getAccount(accountSlug: string) {
  return prisma.account.findUnique({
    where: { slug: accountSlug },
    include: { StoreProfile: true },
  });
}

export async function generateMetadata({ params }: StorefrontPageProps) {
  const { accountSlug } = await params;
  const account = await getAccount(accountSlug);
  const profile = account?.StoreProfile;
  if (!account || account.status !== "active" || !profile?.isPublished) return { title: "Store profile" };

  return {
    title: `${profile.displayName} | Custom Jewelry`,
    description: profile.headline ?? profile.bio ?? `Design custom jewelry with ${profile.displayName}.`,
  };
}

export default async function StorefrontPage({ params }: StorefrontPageProps) {
  const { accountSlug } = await params;
  const tenant = await requirePublicTenantPage(accountSlug);
  const account = await getAccount(tenant.accountSlug);
  if (!account) notFound();

  redirect(`/s/${encodeURIComponent(tenant.accountSlug)}/design`);
}
