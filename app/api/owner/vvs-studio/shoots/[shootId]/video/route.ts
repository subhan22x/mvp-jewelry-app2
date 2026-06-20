import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { getVvsModelSettings } from "@/src/lib/vvs-studio/model-settings";
import { buildVvsStudioVideoPrompt } from "@/src/lib/vvs-studio/prompt-builder";
import { generateVvsVideo } from "@/src/lib/vvs-studio/video-generator";
import { toPublicImageUrl, assertPublicImageUrl } from "@/src/lib/video/public-url";
import { scheduleBackgroundTask } from "@/src/lib/platform/background";
import { consumeUsageCredit, ensureUsageAvailable, usageErrorResponse } from "@/src/lib/usage";

export const maxDuration = 300;

type Ctx = { params: Promise<{ shootId: string }> };

const Body = z.object({
  sourceImageGenerationId: z.string().min(1),
});

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Video generation failed.";
}

function requestedVideoDuration(value: number | null | undefined) {
  return value === 10 ? 10 : 6;
}

export async function POST(req: Request, { params }: Ctx) {
  const { shootId } = await params;
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const accountId = owner.accountId;
  const shoot = await prisma.vvsStudioShoot.findUnique({ where: { id: shootId } });
  if (!shoot || shoot.accountId !== accountId) {
    return NextResponse.json({ error: "Shoot not found." }, { status: 404 });
  }

  try {
    const { sourceImageGenerationId } = Body.parse(await req.json());
    const imageGen = await prisma.vvsStudioImageGeneration.findUnique({ where: { id: sourceImageGenerationId } });
    if (!imageGen || imageGen.shootId !== shoot.id || imageGen.status !== "succeeded" || !imageGen.imageUrl) {
      return NextResponse.json({ error: "Source image generation is not ready." }, { status: 400 });
    }
    await ensureUsageAvailable(accountId, "vvs_video_generated");

    const sourceImageUrl = toPublicImageUrl(req, imageGen.imageUrl);
    assertPublicImageUrl(sourceImageUrl);

    const settings = await getVvsModelSettings(accountId);
    const durationSeconds = requestedVideoDuration(shoot.videoDurationSeconds);
    const prompt = buildVvsStudioVideoPrompt({
      pieceType: shoot.pieceType ?? undefined,
      mood: shoot.mood ?? undefined,
      aspectRatio: shoot.aspectRatio ?? undefined,
      videoDurationSeconds: durationSeconds,
    });

    const videoGenerationId = crypto.randomUUID();
    const startedAt = new Date();
    await prisma.vvsStudioShoot.update({
      where: { id: shoot.id },
      data: { status: "generating_video", error: null, updatedAt: startedAt },
    });
    const videoGen = await prisma.vvsStudioVideoGeneration.create({
      data: {
        id: videoGenerationId,
        accountId,
        shootId: shoot.id,
        sourceImageGenerationId,
        sourceImageUrl,
        prompt,
        provider: "wavespeed",
        modelId: settings.wavespeedVideoModel,
        videoDurationSeconds: durationSeconds,
        status: "pending",
        startedAt,
      },
    });

    scheduleBackgroundTask((async () => {
      const startedMs = startedAt.getTime();
      try {
        const result = await generateVvsVideo({
          sourceImageUrl,
          prompt,
          videoGenerationId: videoGen.id,
          modelId: settings.wavespeedVideoModel,
          durationSeconds,
        });
        const completedAt = new Date();
        const updated = await prisma.vvsStudioVideoGeneration.update({
          where: { id: videoGen.id },
          data: {
            status: "succeeded",
            videoUrl: result.videoUrl,
            remoteVideoUrl: result.remoteVideoUrl,
            modelId: result.modelId,
            providerJobId: result.providerJobId,
            completedAt,
            durationMs: Math.max(0, completedAt.getTime() - startedMs),
            error: null,
          },
        });
        await consumeUsageCredit({
          accountId,
          kind: "vvs_video_generated",
          sourceType: "VvsStudioVideoGeneration",
          sourceId: updated.id,
          metadata: { shootId: shoot.id }
        });
        await prisma.vvsStudioShoot.update({
          where: { id: shoot.id },
          data: { status: "video_succeeded", completedAt, error: null, updatedAt: completedAt },
        });
      } catch (err) {
        console.error(`[vvs video ${videoGen.id}] failed:`, err);
        const completedAt = new Date();
        await prisma.vvsStudioVideoGeneration.update({
          where: { id: videoGen.id },
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
    })(), `vvs-video:${videoGen.id}`);

    return NextResponse.json({ videoGenerationId: videoGen.id }, { status: 201 });
  } catch (err) {
    const usage = usageErrorResponse(err);
    if (usage) return NextResponse.json(usage, { status: 402 });
    const message = errorMessage(err);
    const status = message.includes("APP_BASE_URL") || message.includes("public") ? 500 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
