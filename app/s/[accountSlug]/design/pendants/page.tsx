import PendantsIndex from "@/app/pendants/PendantsIndex";
import { requirePublicTenantPage } from "@/src/lib/tenant-page";

export const dynamic = "force-dynamic";

export default async function PublicPendantsPage({ params }: { params: Promise<{ accountSlug: string }> }) {
  const { accountSlug } = await params;
  const tenant = await requirePublicTenantPage(accountSlug);

  return <PendantsIndex basePath={`/s/${tenant.accountSlug}/design`} />;
}
