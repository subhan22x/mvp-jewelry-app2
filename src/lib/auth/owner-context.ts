import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/src/lib/supabase/server";
import { isSupabaseAuthConfigured } from "@/src/lib/supabase/env";

export type OwnerContext = {
  authUserId: string;
  userId: string;
  accountId: string;
  email: string | null;
  role: string;
};

function isTransientPrismaInitError(error: unknown) {
  return error instanceof Prisma.PrismaClientInitializationError;
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const getOwnerContext = cache(async function getOwnerContext(): Promise<OwnerContext | null> {
  if (!isSupabaseAuthConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const authUserId = data.user.id;

  async function findOwnerUser() {
    return prisma.user.findUnique({
      where: { authUserId },
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
  }

  let user: Awaited<ReturnType<typeof findOwnerUser>>;
  try {
    user = await findOwnerUser();
  } catch (cause) {
    if (!isTransientPrismaInitError(cause)) throw cause;
    await wait(250);
    user = await findOwnerUser();
  }

  const membership = user?.Memberships[0];
  if (!user || !membership) return null;

  return {
    authUserId: data.user.id,
    userId: user.id,
    accountId: membership.accountId,
    email: user.email,
    role: user.role
  };
});

export async function requireOwnerContext() {
  const context = await getOwnerContext();
  if (!context) redirect("/login?next=/owner");
  return context;
}
