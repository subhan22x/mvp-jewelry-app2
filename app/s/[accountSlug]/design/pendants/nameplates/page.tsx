import { notFound } from "next/navigation";
import NameBuilder from "@/app/name/NameBuilder";
import { resolvePublicTenant } from "@/src/lib/tenant";

export const dynamic = "force-dynamic";

export default async function PublicNameplatesPage({ params }: { params: Promise<{ accountSlug: string }> }) {
  const { accountSlug } = await params;
  const tenant = await resolvePublicTenant(accountSlug);
  if (!tenant) notFound();

  return (
    <NameBuilder
      mode="plain"
      accountSlug={tenant.accountSlug}
      backHref={`/s/${tenant.accountSlug}/design/pendants`}
    />
  );
}
