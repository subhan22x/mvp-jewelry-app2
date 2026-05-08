import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/server/db/client";
import { isOwnerSessionValue, OWNER_SESSION_COOKIE } from "@/src/lib/owner-auth";
import OwnerLoginForm from "../OwnerLoginForm";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null) {
  if (!value) return "n/a";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function statusClass(status: string) {
  if (status === "succeeded") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";
  if (status === "failed") return "border-red-300/30 bg-red-400/10 text-red-200";
  return "border-[#f7bc5f]/40 bg-[#1D120C]/90 text-[#f7bc5f]";
}

export default async function OwnerVideosPage() {
  const cookieValue = cookies().get(OWNER_SESSION_COOKIE)?.value;
  if (!isOwnerSessionValue(cookieValue)) {
    return <OwnerLoginForm />;
  }

  const videos = await prisma.videoGeneration.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 120,
    include: {
      request: {
        select: {
          text: true,
          productType: true,
          styleId: true,
          primaryMetal: true,
          secondaryMetal: true
        }
      }
    }
  });

  return (
    <main className="min-h-dvh bg-[#101114] px-4 py-8 text-[#e1e2ec] md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/owner" className="text-sm text-[#adc6ff] hover:text-white">Back to owner dashboard</Link>
            <h1 className="mt-2 text-3xl font-bold">Pendant Videos</h1>
            <p className="mt-1 text-sm text-[#8c909f]">All video jobs, including pending, completed, and failed attempts.</p>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {videos.map(video => (
            <article key={video.id} className="min-w-0 overflow-hidden rounded-xl border border-white/5 bg-[#17191F]">
              <div className="grid grid-cols-2 bg-black">
                <div className="aspect-square border-r border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={video.sourceImageUrl} alt={`${video.request.text} source`} className="h-full w-full object-cover" />
                </div>
                <div className="aspect-square">
                  {video.videoUrl ? (
                    <video src={video.videoUrl} controls playsInline className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-xs text-white/35">
                      No video file yet
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">{video.request.text}</h2>
                    <p className="mt-1 truncate text-xs text-[#8c909f]">{video.request.styleId} / {video.request.primaryMetal}</p>
                  </div>
                  <span className={`flex-shrink-0 rounded border px-2 py-1 text-[10px] font-semibold ${statusClass(video.status)}`}>
                    {video.status}
                  </span>
                </div>
                <p className="text-xs text-[#8c909f]">{formatDate(video.createdAt)}</p>
                {video.error && (
                  <p className="line-clamp-2 rounded border border-red-400/30 bg-red-500/10 px-2 py-1 text-xs text-red-100">{video.error}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Link href={`/owner/videos/${video.id}`} className="rounded-full bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-400">
                    View
                  </Link>
                  {video.videoUrl && (
                    <a href={video.videoUrl} download className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-[#e1e2ec] hover:bg-white/10">
                      Download
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>

        {videos.length === 0 && (
          <div className="rounded-xl border border-white/5 bg-[#17191F] p-8 text-center text-sm text-[#8c909f]">
            No video jobs have been created yet.
          </div>
        )}
      </div>
    </main>
  );
}
