import NecklacesIndex from "@/app/necklaces/NecklacesIndex";
import { requirePublicTenantPage } from "@/src/lib/tenant-page";

export const dynamic = "force-dynamic";

export default async function PublicNecklacesPage({ params }: { params: Promise<{ accountSlug: string }> }) {
  const { accountSlug } = await params;
  const tenant = await requirePublicTenantPage(accountSlug);

  return <NecklacesIndex basePath={`/s/${tenant.accountSlug}/design`} />;
}
