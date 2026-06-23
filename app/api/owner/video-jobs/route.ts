import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { assertPublicImageUrl, toPublicImageUrl } from "@/src/lib/video/public-url";
import { saveRemoteVideoLocally } from "@/src/lib/video/storage";
import { buildJewelryVideoPrompt, generateSeedanceVideo } from "@/lib/video/wavespeed";
import { scheduleBackgroundTask } from "@/src/lib/platform/background";
import { consumeUsageCredit, ensureUsageAvailable, usageErrorResponse } from "@/src/lib/usage";

export const maxDuration = 300;

const Body = z.object({
  resultId: z.string().min(1).optional(),
  quoteId: z.string().min(1).optional()
}).refine(body => Boolean(body.resultId) !== Boolean(body.quoteId), {
  message: "Provide exactly one quoteId or resultId."
});

function getGenerationErrorMessage(err: unknown) {
  return err instanceof Error && err.message ? err.message : "Video generation failed.";
}

export async function POST(req: Request) {
  const owner = await getOwnerContext();
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = Body.parse(await req.json());
    const accountId = owner.accountId;
    const quote = body.quoteId
      ? await prisma.quoteRequest.findFirst({
          where: { id: body.quoteId, accountId },
          select: {
            id: true,
            requestId: true,
            resultId: true,
            designedImageUrl: true,
            status: true
          }
        })
      : null;
    if (body.quoteId && !quote) return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    if (quote && (!quote.requestId || !quote.resultId || !quote.designedImageUrl)) {
      return NextResponse.json({ error: "Select a generated quote image before creating a video preview." }, { status: 400 });
    }
    const selectedResultId = quote?.resultId ?? body.resultId;
    if (!selectedResultId) return NextResponse.json({ error: "Generation result not found." }, { status: 404 });
    const result = await prisma.result.findUnique({
      where: { id: selectedResultId },
      include: { request: true }
    });

    if (!result) return NextResponse.json({ error: "Generation result not found." }, { status: 404 });
    if (result.accountId !== accountId) return NextResponse.json({ error: "Generation result not found." }, { status: 404 });
    const selectedImageUrl = quote?.designedImageUrl ?? result.imageUrl;
    if (result.status !== "succeeded" || !selectedImageUrl) {
      return NextResponse.json({ error: "This generation image is not ready for video generation." }, { status: 400 });
    }
    if ((result.request.productType ?? "name") !== "name") {
      return NextResponse.json({ error: "Video generation is available for name pendant generations only." }, { status: 400 });
    }
    await ensureUsageAvailable(accountId, "design_video_generated");

    const sourceImageUrl = toPublicImageUrl(req, selectedImageUrl);
    assertPublicImageUrl(sourceImageUrl);
    const prompt = buildJewelryVideoPrompt();
    const startedAt = new Date();
    const video = await prisma.videoGeneration.create({
      data: {
        accountId: result.accountId,
        requestId: result.requestId,
        sourceResultId: result.id,
        sourceImageUrl,
        prompt,
        modelId: "bytedance/seedance-2.0-fast/image-to-video",
        status: "pending",
        startedAt
      }
    });
    if (quote) {
      await prisma.quoteRequest.update({
        where: { id: quote.id },
        data: {
          videoId: video.id,
          videoUrl: null,
          previewMediaType: "video",
          status: "priced"
        }
      });
    }

    scheduleBackgroundTask((async () => {
      const startedMs = startedAt.getTime();
      try {
        const generated = await generateSeedanceVideo({ imageUrl: sourceImageUrl, prompt });
        const localVideoUrl = await saveRemoteVideoLocally(generated.videoUrl, video.id);
        const completedAt = new Date();
        const updated = await prisma.videoGeneration.update({
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
        if (quote) {
          await prisma.quoteRequest.updateMany({
            where: { id: quote.id, videoId: video.id },
            data: { videoUrl: localVideoUrl }
          });
        }
        await consumeUsageCredit({
          accountId,
          kind: "design_video_generated",
          sourceType: "VideoGeneration",
          sourceId: updated.id,
          metadata: { requestId: result.requestId }
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
    })(), `owner-video:${video.id}`);

    return NextResponse.json({ videoJobId: video.id }, { status: 201 });
  } catch (err) {
    const usage = usageErrorResponse(err);
    if (usage) return NextResponse.json(usage, { status: 402 });
    const message = getGenerationErrorMessage(err);
    const status = message.includes("configured") || message.includes("APP_BASE_URL") ? 500 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
