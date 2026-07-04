import IcedoutBraceletBuilder from "@/app/bracelets/icedout/IcedoutBraceletBuilder";
import { requirePublicTenantPage } from "@/src/lib/tenant-page";

export const dynamic = "force-dynamic";

export default async function PublicIcedoutBraceletPage({ params }: { params: Promise<{ accountSlug: string }> }) {
  const { accountSlug } = await params;
  const tenant = await requirePublicTenantPage(accountSlug);

  return (
    <IcedoutBraceletBuilder
      accountSlug={tenant.accountSlug}
      backHref={`/s/${tenant.accountSlug}/design/bracelets`}
    />
  );
}
