import { notFound } from "next/navigation";
import DesignEntry from "@/app/design/DesignEntry";
import { resolvePublicTenant } from "@/src/lib/tenant";

export const dynamic = "force-dynamic";

export default async function PublicDesignPage({ params }: { params: Promise<{ accountSlug: string }> }) {
  const { accountSlug } = await params;
  const tenant = await resolvePublicTenant(accountSlug);
  if (!tenant) notFound();

  return <DesignEntry basePath={`/s/${tenant.accountSlug}/design`} />;
}
