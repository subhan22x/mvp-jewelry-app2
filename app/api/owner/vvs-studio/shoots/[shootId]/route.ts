import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { scheduleBackgroundTask } from "@/src/lib/platform/background";
import { processVvsStudioJobsUntilIdle } from "@/src/lib/vvs-studio/pipeline";

type Ctx = { params: Promise<{ shootId: string }> };

const PatchBody = z.object({
  pieceType: z.string().optional(),
  visualStyle: z.string().optional(),
  mood: z.string().optional(),
  aspectRatio: z.string().optional(),
  videoDurationSeconds: z.number().int().refine(value => value === 6 || value === 10).optional(),
  metalType: z.string().optional(),
  goldColor: z.string().optional(),
  diamondWeight: z.string().optional(),
  engravingText: z.string().optional(),
  priceLabel: z.string().optional(),
  stoneSetting: z.string().optional(),
  caption: z.string().max(300).optional(),
  status: z.string().optional(),
});

async function findShoot(shootId: string, accountId: string) {
  const shoot = await prisma.vvsStudioShoot.findUnique({ where: { id: shootId } });
  if (!shoot || shoot.accountId !== accountId) return null;
  return shoot;
}

export async function GET(_req: Request, { params }: Ctx) {
  const { shootId } = await params;
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const shoot = await findShoot(shootId, owner.accountId);
  if (!shoot) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const [uploads, imageGenerations, videoGenerations, jobs] = await Promise.all([
    prisma.vvsStudioUpload.findMany({ where: { shootId: shoot.id }, orderBy: { createdAt: "asc" } }),
    prisma.vvsStudioImageGeneration.findMany({ where: { shootId: shoot.id }, orderBy: { createdAt: "desc" } }),
    prisma.vvsStudioVideoGeneration.findMany({ where: { shootId: shoot.id }, orderBy: { createdAt: "desc" } }),
    prisma.vvsStudioJob.findMany({ where: { shootId: shoot.id }, orderBy: { createdAt: "desc" } }),
  ]);

  if (jobs.some(job => job.status === "queued" || job.status === "running")) {
    scheduleBackgroundTask(processVvsStudioJobsUntilIdle(60_000), `vvs-shoot-poll:${shoot.id}`);
  }

  return NextResponse.json({ shoot, uploads, imageGenerations, videoGenerations, jobs });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { shootId } = await params;
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const shoot = await findShoot(shootId, owner.accountId);
  if (!shoot) return NextResponse.json({ error: "Not found." }, { status: 404 });

  try {
    const body = PatchBody.parse(await req.json());
    const updated = await prisma.vvsStudioShoot.update({
      where: { id: shoot.id },
      data: { ...body, updatedAt: new Date() },
    });
    return NextResponse.json({ shoot: updated });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Update failed." }, { status: 400 });
  }
}
