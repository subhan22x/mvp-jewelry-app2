import DesignEntry from "@/app/design/DesignEntry";
import { requirePublicTenantPage } from "@/src/lib/tenant-page";

export const dynamic = "force-dynamic";

export default async function PublicDesignPage({ params }: { params: Promise<{ accountSlug: string }> }) {
  const { accountSlug } = await params;
  const tenant = await requirePublicTenantPage(accountSlug);

  return <DesignEntry basePath={`/s/${tenant.accountSlug}/design`} />;
}
