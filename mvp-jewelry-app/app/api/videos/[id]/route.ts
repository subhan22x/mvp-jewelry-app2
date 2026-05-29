import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";

function toSeconds(durationMs: number | null) {
  return typeof durationMs === "number" ? Number((durationMs / 1000).toFixed(2)) : null;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const video = await prisma.videoGeneration.findUnique({
    where: { id: params.id },
    include: {
      request: {
        select: {
          id: true,
          productType: true,
          styleId: true,
          text: true,
          primaryMetal: true,
          secondaryMetal: true,
          emblem: true
        }
      }
    }
  });

  if (!video) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    id: video.id,
    requestId: video.requestId,
    sourceResultId: video.sourceResultId,
    sourceImageUrl: video.sourceImageUrl,
    videoUrl: video.videoUrl,
    remoteVideoUrl: video.remoteVideoUrl,
    modelId: video.modelId,
    providerJobId: video.providerJobId,
    status: video.status,
    error: video.error,
    durationMs: video.durationMs,
    durationSeconds: toSeconds(video.durationMs),
    done: video.status === "succeeded" || video.status === "failed",
    request: video.request
  });
}
