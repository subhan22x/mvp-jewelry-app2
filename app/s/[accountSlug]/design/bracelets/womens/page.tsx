import { notFound } from "next/navigation";
import WomensBraceletBuilder from "@/app/bracelets/womens/WomensBraceletBuilder";
import { resolvePublicTenant } from "@/src/lib/tenant";

export const dynamic = "force-dynamic";

export default async function PublicWomensBraceletPage({ params }: { params: Promise<{ accountSlug: string }> }) {
  const { accountSlug } = await params;
  const tenant = await resolvePublicTenant(accountSlug);
  if (!tenant) notFound();

  return (
    <WomensBraceletBuilder
      accountSlug={tenant.accountSlug}
      backHref={`/s/${tenant.accountSlug}/design/bracelets`}
    />
  );
}
