import { notFound } from "next/navigation";
import PendantsIndex from "@/app/pendants/PendantsIndex";
import { resolvePublicTenant } from "@/src/lib/tenant";

export const dynamic = "force-dynamic";

export default async function PublicPendantsPage({ params }: { params: Promise<{ accountSlug: string }> }) {
  const { accountSlug } = await params;
  const tenant = await resolvePublicTenant(accountSlug);
  if (!tenant) notFound();

  return <PendantsIndex basePath={`/s/${tenant.accountSlug}/design`} />;
}
