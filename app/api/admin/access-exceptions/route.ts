import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";

const CreateException = z.object({
  accountId: z.string().min(1),
  reason: z.string().trim().min(3).max(500),
  expiresAt: z.string().datetime().nullable().optional(),
});

async function getSaasAdmin() {
  const owner = await getOwnerContext();
  return owner?.role === "saas_admin" ? owner : null;
}

export async function GET() {
  const admin = await getSaasAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized or forbidden." }, { status: 403 });

  const exceptions = await prisma.accountAccessException.findMany({
    include: { account: { select: { id: true, name: true, slug: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ exceptions });
}

export async function POST(req: Request) {
  const admin = await getSaasAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized or forbidden." }, { status: 403 });

  try {
    const body = CreateException.parse(await req.json());
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (expiresAt && expiresAt <= new Date()) {
      return NextResponse.json({ error: "Expiry must be in the future." }, { status: 400 });
    }

    const account = await prisma.account.findUnique({
      where: { id: body.accountId },
      select: { id: true, status: true },
    });
    if (!account) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    if (account.status !== "active") return NextResponse.json({ error: "Only active accounts can receive complimentary access." }, { status: 400 });

    const now = new Date();
    await prisma.accountAccessException.updateMany({
      where: { accountId: account.id, revokedAt: null, expiresAt: { lte: now } },
      data: { activeAccountId: null },
    });
    const exception = await prisma.accountAccessException.create({
      data: {
        accountId: account.id,
        activeAccountId: account.id,
        reason: body.reason,
        expiresAt,
        createdByUserId: admin.userId,
      },
    });
    return NextResponse.json({ exception }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This account already has an unrevoked access exception. Revoke it before creating another." }, { status: 409 });
    }
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid access exception." }, { status: 400 });
    throw error;
  }
}
