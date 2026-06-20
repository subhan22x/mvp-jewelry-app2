import { notFound } from "next/navigation";
import IcedoutBraceletBuilder from "@/app/bracelets/icedout/IcedoutBraceletBuilder";
import { resolvePublicTenant } from "@/src/lib/tenant";

export const dynamic = "force-dynamic";

export default async function PublicIcedoutBraceletPage({ params }: { params: Promise<{ accountSlug: string }> }) {
  const { accountSlug } = await params;
  const tenant = await resolvePublicTenant(accountSlug);
  if (!tenant) notFound();

  return (
    <IcedoutBraceletBuilder
      accountSlug={tenant.accountSlug}
      backHref={`/s/${tenant.accountSlug}/design/bracelets`}
    />
  );
}
