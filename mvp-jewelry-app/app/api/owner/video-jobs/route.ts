import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { isOwnerRequestAuthenticated } from "@/src/lib/owner-auth";
import { assertPublicImageUrl, toPublicImageUrl } from "@/src/lib/video/public-url";
import { saveRemoteVideoLocally } from "@/src/lib/video/storage";
import { buildJewelryVideoPrompt, generateSeedanceVideo } from "@/lib/video/wavespeed";

const Body = z.object({
  resultId: z.string().min(1)
});

function getGenerationErrorMessage(err: unknown) {
  return err instanceof Error && err.message ? err.message : "Video generation failed.";
}

export async function POST(req: Request) {
  if (!isOwnerRequestAuthenticated(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = Body.parse(await req.json());
    const result = await prisma.result.findUnique({
      where: { id: body.resultId },
      include: { request: true }
    });

    if (!result) return NextResponse.json({ error: "Generation result not found." }, { status: 404 });
    if (result.status !== "succeeded" || !result.imageUrl) {
      return NextResponse.json({ error: "This generation image is not ready for video generation." }, { status: 400 });
    }
    if ((result.request.productType ?? "name") !== "name") {
      return NextResponse.json({ error: "Video generation is available for name pendant generations only." }, { status: 400 });
    }

    const sourceImageUrl = toPublicImageUrl(req, result.imageUrl);
    assertPublicImageUrl(sourceImageUrl);
    const prompt = buildJewelryVideoPrompt();
    const startedAt = new Date();
    const video = await prisma.videoGeneration.create({
      data: {
        requestId: result.requestId,
        sourceResultId: result.id,
        sourceImageUrl,
        prompt,
        modelId: "bytedance/seedance-2.0-fast/image-to-video",
        status: "pending",
        startedAt
      }
    });

    void (async () => {
      const startedMs = startedAt.getTime();
      try {
        const generated = await generateSeedanceVideo({ imageUrl: sourceImageUrl, prompt });
        const localVideoUrl = await saveRemoteVideoLocally(generated.videoUrl, video.id);
        const completedAt = new Date();
        await prisma.videoGeneration.update({
          where: { id: video.id },
          data: {
            videoUrl: localVideoUrl,
            remoteVideoUrl: generated.videoUrl,
            modelId: generated.modelId,
            providerJobId: generated.providerJobId,
            status: "succeeded",
            error: null,
            completedAt,
            durationMs: Math.max(0, completedAt.getTime() - startedMs)
          }
        });
      } catch (err) {
        console.error(`[owner video ${video.id}] generation failed:`, err);
        const completedAt = new Date();
        await prisma.videoGeneration.update({
          where: { id: video.id },
          data: {
            status: "failed",
            error: getGenerationErrorMessage(err),
            completedAt,
            durationMs: Math.max(0, completedAt.getTime() - startedMs)
          }
        });
      }
    })();

    return NextResponse.json({ videoJobId: video.id }, { status: 201 });
  } catch (err) {
    const message = getGenerationErrorMessage(err);
    const status = message.includes("configured") || message.includes("APP_BASE_URL") ? 500 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
