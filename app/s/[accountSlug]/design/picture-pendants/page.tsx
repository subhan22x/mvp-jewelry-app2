import PicturePendantsBuilder from "@/app/picture-pendants/PicturePendantsBuilder";
import { requirePublicTenantPage } from "@/src/lib/tenant-page";

export const dynamic = "force-dynamic";

export default async function PublicPicturePendantsPage({ params }: { params: Promise<{ accountSlug: string }> }) {
  const { accountSlug } = await params;
  const tenant = await requirePublicTenantPage(accountSlug);

  return (
    <PicturePendantsBuilder
      accountSlug={tenant.accountSlug}
      backHref={`/s/${tenant.accountSlug}/design/pendants`}
    />
  );
}
