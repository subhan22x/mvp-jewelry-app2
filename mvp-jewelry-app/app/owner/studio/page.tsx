import Link from "next/link";
import { prisma } from "@/server/db/client";
import { getDefaultAccountId } from "@/src/lib/account";
import OwnerFrame from "../OwnerFrame";
import OwnerLoginForm from "../OwnerLoginForm";
import { isOwnerAuthenticated } from "../_auth";
import GenerationVideoCard from "../GenerationVideoCard";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null) {
  if (!value) return "n/a";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(value);
}

export default async function OwnerStudioPage() {
  if (!isOwnerAuthenticated()) return <OwnerLoginForm />;

  const accountId = getDefaultAccountId();
  const [recentResults, videoJobs] = await Promise.all([
    prisma.result.findMany({
      where: { accountId, request: { productType: "name" } },
      orderBy: [{ createdAt: "desc" }],
      take: 12,
      include: {
        request: {
          select: {
            text: true,
            productType: true,
            uploadFileName: true,
            styleId: true,
            Videos: {
              select: {
                id: true,
                sourceResultId: true,
                status: true
              },
              orderBy: { createdAt: "desc" }
            }
          }
        }
      }
    }),
    prisma.videoGeneration.findMany({
      where: { accountId },
      orderBy: [{ createdAt: "desc" }],
      take: 6,
      include: { request: { select: { text: true, styleId: true } } }
    })
  ]);

  return (
    <OwnerFrame active="Studio">
      <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-8 px-4 md:px-6">
        <section>
          <h1 className="text-[32px] font-bold tracking-tight text-[#e1e2ec] md:text-4xl">Studio</h1>
          <p className="mt-2 text-[15px] text-[#c2c6d6]">Generated drafts, video jobs, and creative production tools.</p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Link href="/owner/videos" className="rounded-xl border border-[#D1B873]/20 bg-[#17191F] p-5 hover:bg-[#1d2028]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f7bc5f]">Videos</p>
            <h2 className="mt-3 text-xl font-bold">Pendant video jobs</h2>
            <p className="mt-2 text-sm text-[#8c909f]">View loading states, completed clips, downloads, and share links.</p>
          </Link>
          <div className="rounded-xl border border-white/5 bg-[#17191F] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8c909f]">Images</p>
            <h2 className="mt-3 text-xl font-bold">{recentResults.length}</h2>
            <p className="mt-2 text-sm text-[#8c909f]">Recent name pendant drafts.</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#17191F] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8c909f]">Queue</p>
            <h2 className="mt-3 text-xl font-bold">{videoJobs.filter(job => job.status === "pending").length}</h2>
            <p className="mt-2 text-sm text-[#8c909f]">Pending video jobs.</p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <details open className="group rounded-xl border border-white/5 bg-[#17191F] p-4">
            <summary className="flex min-w-0 cursor-pointer list-none items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-[#8c909f]">Generate Video</h2>
                <p className="mt-1 text-sm text-[#c2c6d6]">Name pendant drafts ready for video</p>
              </div>
              <Link href="/owner/videos" className="flex-shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-[#c2c6d6] hover:bg-white/10">
                All videos
              </Link>
            </summary>
            <div className="mt-4 flex min-w-0 flex-col gap-3">
              {recentResults.map(result => (
                <GenerationVideoCard key={result.id} row={result} />
              ))}
              {recentResults.length === 0 && <p className="text-sm text-[#8c909f]">No name pendant drafts are ready for video yet.</p>}
            </div>
          </details>

          <div className="rounded-xl border border-white/5 bg-[#17191F] p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-[#8c909f]">Video Jobs</h2>
            <div className="mt-4 flex flex-col gap-3">
              {videoJobs.map(job => (
                <Link key={job.id} href={`/owner/videos/${job.id}`} className="rounded-lg border border-white/5 bg-[#101114] p-3 hover:bg-white/5">
                  <p className="truncate text-sm font-semibold">{job.request.text}</p>
                  <p className="mt-1 text-xs text-[#8c909f]">{job.status} / {formatDate(job.createdAt)}</p>
                </Link>
              ))}
              {videoJobs.length === 0 && <p className="text-sm text-[#8c909f]">No video jobs yet.</p>}
            </div>
          </div>
        </section>
      </div>
    </OwnerFrame>
  );
}
