import LogoPendantBuilder from "@/app/pendants/logo/LogoPendantBuilder";
import { requirePublicTenantPage } from "@/src/lib/tenant-page";

export const dynamic = "force-dynamic";

export default async function PublicLogoPendantPage({ params }: { params: Promise<{ accountSlug: string }> }) {
  const { accountSlug } = await params;
  const tenant = await requirePublicTenantPage(accountSlug);

  return <LogoPendantBuilder basePath={`/s/${tenant.accountSlug}/design`} />;
}
