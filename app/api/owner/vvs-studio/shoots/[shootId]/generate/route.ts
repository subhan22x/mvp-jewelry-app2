import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { getVvsModelSettings } from "@/src/lib/vvs-studio/model-settings";
import { buildVvsStudioImagePrompt } from "@/src/lib/vvs-studio/prompt-builder";
import { generateVvsImage } from "@/src/lib/vvs-studio/image-generator";
import { readVvsSourceAttachment } from "@/src/lib/vvs-studio/source-storage";
import { scheduleBackgroundTask } from "@/src/lib/platform/background";
import { consumeUsageCredit, ensureUsageAvailable, usageErrorResponse } from "@/src/lib/usage";

export const maxDuration = 300;

type Ctx = { params: Promise<{ shootId: string }> };

const Body = z.object({
  provider: z.enum(["openai", "gemini"]).optional(),
  modelId: z.string().min(1).optional(),
});

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Generation failed.";
}

export async function POST(req: Request, { params }: Ctx) {
  const { shootId } = await params;
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const accountId = owner.accountId;
  const shoot = await prisma.vvsStudioShoot.findUnique({
    where: { id: shootId },
    include: { Uploads: true },
  });
  if (!shoot || shoot.accountId !== accountId) {
    return NextResponse.json({ error: "Shoot not found." }, { status: 404 });
  }
  if (!shoot.Uploads.length) {
    return NextResponse.json({ error: "Upload at least one photo before generating." }, { status: 400 });
  }
  try {
    await ensureUsageAvailable(accountId, "vvs_product_post_generated");
  } catch (err) {
    const usage = usageErrorResponse(err);
    if (usage) return NextResponse.json(usage, { status: 402 });
    throw err;
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json().catch(() => ({})));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid generation request." }, { status: 400 });
  }

  const settings = await getVvsModelSettings(accountId);
  const provider = body.provider ?? settings.imageProvider;
  const modelId = body.modelId ?? (provider === "openai" ? settings.openaiImageModel : settings.geminiImageModel);

  const prompt = buildVvsStudioImagePrompt({
    pieceType: shoot.pieceType ?? undefined,
    mood: shoot.mood ?? undefined,
    visualStyle: shoot.visualStyle ?? undefined,
    aspectRatio: shoot.aspectRatio ?? undefined,
    metalType: shoot.metalType ?? undefined,
    goldColor: shoot.goldColor ?? undefined,
    stoneSetting: shoot.stoneSetting ?? undefined,
    diamondWeight: shoot.diamondWeight ?? undefined,
    engravingText: shoot.engravingText ?? undefined,
    priceLabel: shoot.priceLabel ?? undefined,
  });

  const generationId = crypto.randomUUID();
  const startedAt = new Date();
  const generation = await prisma.vvsStudioImageGeneration.create({
    data: {
      id: generationId,
      accountId,
      shootId: shoot.id,
      prompt,
      provider,
      modelId,
      status: "pending",
      startedAt,
    },
  });

  const ANGLE_ORDER = ["top", "left", "right"];
  const orderedUploads = shoot.Uploads
    .slice()
    .sort((a, b) => ANGLE_ORDER.indexOf(a.angle) - ANGLE_ORDER.indexOf(b.angle))
    .slice(0, 3);

  await prisma.vvsStudioShoot.update({
    where: { id: shoot.id },
    data: { status: "generating_image", error: null, updatedAt: new Date() },
  });

  scheduleBackgroundTask((async () => {
    const startedMs = startedAt.getTime();
    try {
      const attachments = await Promise.all(orderedUploads.map(readVvsSourceAttachment));
      const result = await generateVvsImage({
        provider,
        modelId,
        prompt,
        attachments,
        generationId: generation.id,
      });
      const completedAt = new Date();
      const updated = await prisma.vvsStudioImageGeneration.update({
        where: { id: generation.id },
        data: {
          status: "succeeded",
          imageUrl: result.imageUrl,
          modelId: result.modelId,
          completedAt,
          durationMs: Math.max(0, completedAt.getTime() - startedMs),
          error: null,
        },
      });
      await consumeUsageCredit({
        accountId,
        kind: "vvs_product_post_generated",
        sourceType: "VvsStudioImageGeneration",
        sourceId: updated.id,
        metadata: { shootId: shoot.id }
      });
      await prisma.vvsStudioShoot.update({
        where: { id: shoot.id },
        data: { status: "image_succeeded", error: null, updatedAt: completedAt },
      });
    } catch (err) {
      console.error(`[vvs image ${generation.id}] failed:`, err);
      const completedAt = new Date();
      await prisma.vvsStudioImageGeneration.update({
        where: { id: generation.id },
        data: {
          status: "failed",
          error: errorMessage(err),
          completedAt,
          durationMs: Math.max(0, completedAt.getTime() - startedMs),
        },
      });
      await prisma.vvsStudioShoot.update({
        where: { id: shoot.id },
        data: { status: "failed", error: errorMessage(err), updatedAt: completedAt },
      });
    }
  })(), `vvs-image:${generation.id}`);

  return NextResponse.json({ generationId: generation.id }, { status: 201 });
}
