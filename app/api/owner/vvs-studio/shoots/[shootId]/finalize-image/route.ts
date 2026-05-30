import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getDefaultAccountId } from "@/src/lib/account";

type Ctx = { params: { shootId: string } };

const Body = z.object({ generationId: z.string().min(1) });

export async function POST(req: Request, { params }: Ctx) {
  const accountId = getDefaultAccountId();
  const shoot = await prisma.vvsStudioShoot.findUnique({ where: { id: params.shootId } });
  if (!shoot || shoot.accountId !== accountId) {
    return NextResponse.json({ error: "Shoot not found." }, { status: 404 });
  }

  try {
    const { generationId } = Body.parse(await req.json());
    const gen = await prisma.vvsStudioImageGeneration.findUnique({ where: { id: generationId } });
    if (!gen || gen.shootId !== shoot.id || gen.status !== "succeeded" || !gen.imageUrl) {
      return NextResponse.json({ error: "Generation not ready." }, { status: 400 });
    }

    await prisma.vvsStudioShoot.update({
      where: { id: shoot.id },
      data: { status: "image_finalized", imageFinalizedAt: new Date(), error: null, updatedAt: new Date() },
    });

    return NextResponse.json({ imageUrl: gen.imageUrl });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 400 });
  }
}
