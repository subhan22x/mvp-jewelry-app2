import NameBuilder from "@/app/name/NameBuilder";
import { requirePublicTenantPage } from "@/src/lib/tenant-page";

export const dynamic = "force-dynamic";

export default async function PublicIcedoutPage({ params }: { params: Promise<{ accountSlug: string }> }) {
  const { accountSlug } = await params;
  const tenant = await requirePublicTenantPage(accountSlug);

  return (
    <NameBuilder
      mode="icedout"
      accountSlug={tenant.accountSlug}
      backHref={`/s/${tenant.accountSlug}/design/pendants`}
    />
  );
}
