import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getDefaultAccountId } from "@/src/lib/account";
import { getVvsModelSettings } from "@/src/lib/vvs-studio/model-settings";
import { buildVvsStudioVideoPrompt } from "@/src/lib/vvs-studio/prompt-builder";
import { generateVvsVideo } from "@/src/lib/vvs-studio/video-generator";
import { toPublicImageUrl, assertPublicImageUrl } from "@/src/lib/video/public-url";

type Ctx = { params: { shootId: string } };

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
  const accountId = getDefaultAccountId();
  const shoot = await prisma.vvsStudioShoot.findUnique({ where: { id: params.shootId } });
  if (!shoot || shoot.accountId !== accountId) {
    return NextResponse.json({ error: "Shoot not found." }, { status: 404 });
  }

  try {
    const { sourceImageGenerationId } = Body.parse(await req.json());
    const imageGen = await prisma.vvsStudioImageGeneration.findUnique({ where: { id: sourceImageGenerationId } });
    if (!imageGen || imageGen.shootId !== shoot.id || imageGen.status !== "succeeded" || !imageGen.imageUrl) {
      return NextResponse.json({ error: "Source image generation is not ready." }, { status: 400 });
    }

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

    void (async () => {
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
        await prisma.vvsStudioVideoGeneration.update({
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
    })();

    return NextResponse.json({ videoGenerationId: videoGen.id }, { status: 201 });
  } catch (err) {
    const message = errorMessage(err);
    const status = message.includes("APP_BASE_URL") || message.includes("public") ? 500 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
