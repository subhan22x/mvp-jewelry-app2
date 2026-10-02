import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";

export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (owner.role !== "saas_admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const result = await prisma.accountAccessException.updateMany({
    where: { id, activeAccountId: { not: null } },
    data: { revokedAt: new Date(), revokedByUserId: owner.userId, activeAccountId: null },
  });
  if (result.count === 0) {
    const existing = await prisma.accountAccessException.findUnique({ where: { id }, select: { id: true } });
    return NextResponse.json({ error: existing ? "Access exception is already revoked." : "Access exception not found." }, { status: existing ? 409 : 404 });
  }
  const exception = await prisma.accountAccessException.findUnique({ where: { id } });
  return NextResponse.json({ exception });
}
