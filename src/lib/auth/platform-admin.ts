import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/client";
import { createClient } from "@/src/lib/supabase/server";
import { isSupabaseAuthConfigured } from "@/src/lib/supabase/env";

export type PlatformAdminContext = {
  authUserId: string;
  userId: string;
  email: string | null;
};

export const getPlatformAdminContext = cache(async function getPlatformAdminContext(): Promise<PlatformAdminContext | null> {
  if (!isSupabaseAuthConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const user = await prisma.user.findUnique({
    where: { authUserId: data.user.id },
    select: { id: true, email: true, role: true }
  });

  if (!user || user.role !== "saas_admin") return null;
  return { authUserId: data.user.id, userId: user.id, email: user.email };
});

export async function requirePlatformAdmin() {
  const admin = await getPlatformAdminContext();
  if (!admin) redirect("/login?next=/admin/qr-kits");
  return admin;
}
