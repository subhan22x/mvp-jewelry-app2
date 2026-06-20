import { notFound } from "next/navigation";
import PicturePendantsBuilder from "@/app/picture-pendants/PicturePendantsBuilder";
import { resolvePublicTenant } from "@/src/lib/tenant";

export const dynamic = "force-dynamic";

export default async function PublicPicturePendantsPage({ params }: { params: Promise<{ accountSlug: string }> }) {
  const { accountSlug } = await params;
  const tenant = await resolvePublicTenant(accountSlug);
  if (!tenant) notFound();

  return (
    <PicturePendantsBuilder
      accountSlug={tenant.accountSlug}
      backHref={`/s/${tenant.accountSlug}/design/pendants`}
    />
  );
}
