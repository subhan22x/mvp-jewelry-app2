import { notFound, redirect } from "next/navigation";
import { resolvePublicTenantAccess } from "@/src/lib/tenant";

export async function requirePublicTenantPage(accountSlug: string) {
  const access = await resolvePublicTenantAccess(accountSlug);
  if (access.status === "ok") return access.tenant;
  if (access.status === "access_denied") {
    redirect(`/s/${encodeURIComponent(access.accountSlug)}/access-denied`);
  }
  notFound();
}
