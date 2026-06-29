import { notFound } from "next/navigation";
import GrillzBuilder from "@/app/grillz/GrillzBuilder";
import { resolvePublicTenant } from "@/src/lib/tenant";

export const dynamic = "force-dynamic";

export default async function PublicGrillzPage({ params }: { params: Promise<{ accountSlug: string }> }) {
  const { accountSlug } = await params;
  const tenant = await resolvePublicTenant(accountSlug);
  if (!tenant) notFound();

  return (
    <GrillzBuilder
      accountSlug={tenant.accountSlug}
      backHref={`/s/${tenant.accountSlug}/design`}
    />
  );
}

