import { notFound } from "next/navigation";
import NecklacesIndex from "@/app/necklaces/NecklacesIndex";
import { resolvePublicTenant } from "@/src/lib/tenant";

export const dynamic = "force-dynamic";

export default async function PublicNecklacesPage({ params }: { params: Promise<{ accountSlug: string }> }) {
  const { accountSlug } = await params;
  const tenant = await resolvePublicTenant(accountSlug);
  if (!tenant) notFound();

  return <NecklacesIndex basePath={`/s/${tenant.accountSlug}/design`} />;
}
