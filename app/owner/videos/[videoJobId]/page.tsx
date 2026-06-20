import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/db/client";
import { requireOwnerContext } from "@/src/lib/auth/owner-context";
import VideoJobStatus from "../VideoJobStatus";

export const dynamic = "force-dynamic";

function toSeconds(durationMs: number | null) {
  return typeof durationMs === "number" ? Number((durationMs / 1000).toFixed(2)) : null;
}

export default async function OwnerVideoJobPage({ params }: { params: Promise<{ videoJobId: string }> }) {
  const { videoJobId } = await params;
  const { accountId } = await requireOwnerContext();
  const video = await prisma.videoGeneration.findFirst({
    where: { id: videoJobId, accountId },
    include: {
      QuoteRequests: {
        select: { id: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 1
      },
      request: {
        select: {
          text: true,
          styleId: true,
          primaryMetal: true,
          secondaryMetal: true,
          emblem: true
        }
      }
    }
  });

  if (!video) notFound();
  const boundQuote = video.QuoteRequests[0];
  if (boundQuote) {
    redirect(`/owner/quotes/${boundQuote.id}/${["sent", "fulfilled", "closed"].includes(boundQuote.status) ? "preview" : "media"}`);
  }

  return (
    <main className="min-h-dvh bg-[#101114] px-4 py-8 text-[#e1e2ec] md:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/owner/videos" className="text-sm text-[#adc6ff] hover:text-white">Back to videos</Link>
            <h1 className="mt-2 text-3xl font-bold">Pendant Video</h1>
          </div>
          <Link href="/owner" className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#c2c6d6] hover:bg-white/10">
            Owner dashboard
          </Link>
        </div>

        <VideoJobStatus
          initialJob={{
            id: video.id,
            sourceImageUrl: video.sourceImageUrl,
            videoUrl: video.videoUrl,
            remoteVideoUrl: video.remoteVideoUrl,
            status: video.status,
            error: video.error,
            durationSeconds: toSeconds(video.durationMs),
            done: video.status === "succeeded" || video.status === "failed",
            request: video.request
          }}
        />
      </div>
    </main>
  );
}
