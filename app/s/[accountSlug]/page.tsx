import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/db/client";

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
  const account = await getAccount(accountSlug);
  const profile = account?.StoreProfile;
  if (!account || account.status !== "active" || !profile?.isPublished) notFound();

  redirect(`/name?account=${encodeURIComponent(account.slug)}`);
}
