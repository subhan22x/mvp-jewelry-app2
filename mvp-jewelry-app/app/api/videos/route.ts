import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { buildJewelryVideoPrompt, generateSeedanceVideo } from "@/lib/video/wavespeed";

const Body = z.object({
  requestId: z.string().min(1),
  accessCode: z.string().min(1)
});

function getExpectedAccessCode() {
  const accessCode = process.env.VIDEO_ACCESS_CODE;
  if (!accessCode) throw new Error("VIDEO_ACCESS_CODE is not configured.");
  return accessCode;
}

function getPublicBaseUrl(req: Request) {
  const baseUrl = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (baseUrl) return baseUrl;

  const origin = req.headers.get("origin");
  if (origin) return origin;

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  throw new Error("APP_BASE_URL or NEXT_PUBLIC_APP_URL is required so Wavespeed can fetch the generated image.");
}

function toPublicImageUrl(req: Request, imageUrl: string) {
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return new URL(imageUrl, getPublicBaseUrl(req)).toString();
}

function assertPublicImageUrl(sourceImageUrl: string) {
  const url = new URL(sourceImageUrl);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    throw new Error("A public APP_BASE_URL or NEXT_PUBLIC_APP_URL is required so Wavespeed can fetch the generated image.");
  }
}

function getGenerationErrorMessage(err: unknown) {
  return err instanceof Error && err.message ? err.message : "Video generation failed.";
}

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    if (body.accessCode !== getExpectedAccessCode()) {
      return NextResponse.json({ error: "Invalid access code." }, { status: 401 });
    }

    const request = await prisma.request.findUnique({
      where: { id: body.requestId },
      include: { Results: { orderBy: { variant: "asc" } } }
    });

    if (!request) return NextResponse.json({ error: "Request not found." }, { status: 404 });
    if ((request.productType ?? "name") !== "name") {
      return NextResponse.json({ error: "Video generation is currently available for name pendant generations only." }, { status: 400 });
    }

    const betterResult = request.Results.find(result => result.variant === 1 && result.status === "succeeded" && result.imageUrl);
    if (!betterResult?.imageUrl) {
      return NextResponse.json({ error: "The higher quality draft is not ready, so video generation cannot start yet." }, { status: 400 });
    }

    const sourceImageUrl = toPublicImageUrl(req, betterResult.imageUrl);
    assertPublicImageUrl(sourceImageUrl);
    const prompt = buildJewelryVideoPrompt();
    const startedAt = new Date();
    const video = await prisma.videoGeneration.create({
      data: {
        requestId: request.id,
        sourceResultId: betterResult.id,
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
        const result = await generateSeedanceVideo({ imageUrl: sourceImageUrl, prompt });
        const completedAt = new Date();
        await prisma.videoGeneration.update({
          where: { id: video.id },
          data: {
            videoUrl: result.videoUrl,
            modelId: result.modelId,
            providerJobId: result.providerJobId,
            status: "succeeded",
            error: null,
            completedAt,
            durationMs: Math.max(0, completedAt.getTime() - startedMs)
          }
        });
      } catch (err) {
        console.error(`[video ${video.id}] generation failed:`, err);
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

    return NextResponse.json({ videoId: video.id }, { status: 201 });
  } catch (err) {
    const message = getGenerationErrorMessage(err);
    const status = message.includes("configured") || message.includes("APP_BASE_URL") ? 500 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
