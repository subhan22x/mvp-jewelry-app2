import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getDefaultAccountId } from "@/src/lib/account";

type Ctx = { params: { videoGenerationId: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const accountId = getDefaultAccountId();
  const gen = await prisma.vvsStudioVideoGeneration.findUnique({ where: { id: params.videoGenerationId } });
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
