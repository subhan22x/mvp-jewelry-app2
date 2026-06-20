import { notFound } from "next/navigation";
import BraceletsIndex from "@/app/bracelets/BraceletsIndex";
import { resolvePublicTenant } from "@/src/lib/tenant";

export const dynamic = "force-dynamic";

export default async function PublicBraceletsPage({ params }: { params: Promise<{ accountSlug: string }> }) {
  const { accountSlug } = await params;
  const tenant = await resolvePublicTenant(accountSlug);
  if (!tenant) notFound();

  return <BraceletsIndex basePath={`/s/${tenant.accountSlug}/design`} />;
}
