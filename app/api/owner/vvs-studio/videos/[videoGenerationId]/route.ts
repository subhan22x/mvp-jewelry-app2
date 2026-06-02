import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";

type Ctx = { params: Promise<{ videoGenerationId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { videoGenerationId } = await params;
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const accountId = owner.accountId;
  const gen = await prisma.vvsStudioVideoGeneration.findUnique({ where: { id: videoGenerationId } });
  if (!gen || gen.accountId !== accountId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({
    videoGenerationId: gen.id,
    status: gen.status,
    videoUrl: gen.videoUrl,
    error: gen.error,
  });
}
