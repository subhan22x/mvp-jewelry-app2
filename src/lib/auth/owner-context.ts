import { prisma } from "@/server/db/client";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { isSupabaseAuthConfigured } from "@/src/lib/supabase/env";

export type OwnerContext = {
  authUserId: string;
  userId: string;
  accountId: string;
  email: string | null;
  role: string;
};

export async function getOwnerContext(): Promise<OwnerContext | null> {
  if (!isSupabaseAuthConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const user = await prisma.user.findUnique({
    where: { authUserId: data.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      Memberships: {
        where: { status: "active", account: { status: "active" } },
        select: { accountId: true },
        orderBy: { createdAt: "asc" },
        take: 1
      }
    }
  });

  const membership = user?.Memberships[0];
  if (!user || !membership) return null;

  return {
    authUserId: data.user.id,
    userId: user.id,
    accountId: membership.accountId,
    email: user.email,
    role: user.role
  };
}

export async function requireOwnerContext() {
  const context = await getOwnerContext();
  if (!context) redirect("/login?next=/owner");
  return context;
}
