import { notFound } from "next/navigation";
import NecklacesBuilder from "@/app/necklaces/NecklacesBuilder";
import { getNecklaceStyle } from "@/app/necklaces/necklace-options";
import { requirePublicTenantPage } from "@/src/lib/tenant-page";

export const dynamic = "force-dynamic";

export default async function PublicNecklaceStylePage({ params }: { params: Promise<{ accountSlug: string; styleId: string }> }) {
  const { accountSlug, styleId } = await params;
  const tenant = await requirePublicTenantPage(accountSlug);
  const style = getNecklaceStyle(styleId);
  if (!style) notFound();

  return <NecklacesBuilder basePath={`/s/${tenant.accountSlug}/design`} initialStyle={style} />;
}
