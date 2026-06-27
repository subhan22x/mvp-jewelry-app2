import { notFound } from "next/navigation";
import NecklacesBuilder from "@/app/necklaces/NecklacesBuilder";
import { getNecklaceStyle } from "@/app/necklaces/necklace-options";
import { resolvePublicTenant } from "@/src/lib/tenant";

export const dynamic = "force-dynamic";

export default async function PublicNecklaceStylePage({ params }: { params: Promise<{ accountSlug: string; styleId: string }> }) {
  const { accountSlug, styleId } = await params;
  const tenant = await resolvePublicTenant(accountSlug);
  const style = getNecklaceStyle(styleId);
  if (!tenant || !style) notFound();

  return <NecklacesBuilder basePath={`/s/${tenant.accountSlug}/design`} initialStyle={style} />;
}
