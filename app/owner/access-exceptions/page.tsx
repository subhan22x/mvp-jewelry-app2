import { redirect } from "next/navigation";
import { prisma } from "@/server/db/client";
import { requireOwnerContext } from "@/src/lib/auth/owner-context";
import OwnerFrame from "../OwnerFrame";
import AccessExceptionsManager from "./AccessExceptionsManager";

export const dynamic = "force-dynamic";

export default async function AccessExceptionsPage() {
  const owner = await requireOwnerContext();
  if (owner.role !== "saas_admin") redirect("/owner");

  const [accounts, exceptions] = await Promise.all([
    prisma.account.findMany({
      where: { status: "active" },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    prisma.accountAccessException.findMany({
      include: { account: { select: { id: true, name: true, slug: true, status: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <OwnerFrame active="Access">
      <AccessExceptionsManager accounts={accounts} evaluatedAt={new Date().toISOString()} initialExceptions={exceptions.map(exception => ({
        ...exception,
        createdAt: exception.createdAt.toISOString(),
        expiresAt: exception.expiresAt?.toISOString() ?? null,
        revokedAt: exception.revokedAt?.toISOString() ?? null,
      }))} />
    </OwnerFrame>
  );
}
