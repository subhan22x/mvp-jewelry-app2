import BraceletsIndex from "@/app/bracelets/BraceletsIndex";
import { requirePublicTenantPage } from "@/src/lib/tenant-page";

export const dynamic = "force-dynamic";

export default async function PublicBraceletsPage({ params }: { params: Promise<{ accountSlug: string }> }) {
  const { accountSlug } = await params;
  const tenant = await requirePublicTenantPage(accountSlug);

  return <BraceletsIndex basePath={`/s/${tenant.accountSlug}/design`} />;
}
