import { notFound } from "next/navigation";
import LogoPendantBuilder from "@/app/pendants/logo/LogoPendantBuilder";
import { resolvePublicTenant } from "@/src/lib/tenant";

export const dynamic = "force-dynamic";

export default async function PublicLogoPendantPage({ params }: { params: Promise<{ accountSlug: string }> }) {
  const { accountSlug } = await params;
  const tenant = await resolvePublicTenant(accountSlug);
  if (!tenant) notFound();

  return <LogoPendantBuilder basePath={`/s/${tenant.accountSlug}/design`} />;
}
