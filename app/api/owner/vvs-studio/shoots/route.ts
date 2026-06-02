import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";

const CreateBody = z.object({
  pieceType: z.string().optional(),
  visualStyle: z.string().optional(),
});

export async function POST(req: Request) {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const body = CreateBody.parse(await req.json());
    const accountId = owner.accountId;

    const shoot = await prisma.vvsStudioShoot.create({
      data: {
        id: crypto.randomUUID(),
        accountId,
        pieceType: body.pieceType,
        visualStyle: body.visualStyle,
        status: "draft",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ shootId: shoot.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create shoot.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const accountId = owner.accountId;
  const shoots = await prisma.vvsStudioShoot.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      Uploads: { select: { id: true, angle: true, imageUrl: true } },
      ImageGenerations: { select: { id: true, status: true, imageUrl: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return NextResponse.json({ shoots });
}
