import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";

type Ctx = { params: { generationId: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const accountId = owner.accountId;
  const gen = await prisma.vvsStudioImageGeneration.findUnique({ where: { id: params.generationId } });
  if (!gen || gen.accountId !== accountId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({
    generationId: gen.id,
    status: gen.status,
    imageUrl: gen.imageUrl,
    error: gen.error,
  });
}
