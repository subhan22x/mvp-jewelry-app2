"use client";

import { useEffect, useMemo, useState } from "react";

type VideoJob = {
  id: string;
  sourceImageUrl: string;
  videoUrl: string | null;
  remoteVideoUrl: string | null;
  status: string;
  error: string | null;
  durationSeconds: number | null;
  done: boolean;
  request: {
    text: string;
    styleId: string;
    primaryMetal: string;
    secondaryMetal: string | null;
    emblem: string;
  };
};

type Props = {
  initialJob: VideoJob;
};

function statusLabel(status: string) {
  if (status === "succeeded") return "Completed";
  if (status === "failed") return "Failed";
  return "Generating";
}

export default function VideoJobStatus({ initialJob }: Props) {
  const [job, setJob] = useState(initialJob);
  const [copyLabel, setCopyLabel] = useState("Share");
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return job.videoUrl ?? "";
    return job.videoUrl ? new URL(job.videoUrl, window.location.origin).toString() : window.location.href;
  }, [job.videoUrl]);

  useEffect(() => {
    if (job.done) return;

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/owner/video-jobs/${job.id}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setJob(data);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [job.done, job.id]);

  async function handleShare() {
    if (navigator.share && job.videoUrl) {
      await navigator.share({ title: "Pendant video", url: shareUrl });
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Share"), 1600);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <div className="min-w-0 rounded-xl border border-white/5 bg-[#17191F] p-4">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={job.sourceImageUrl} alt={`${job.request.text} source pendant`} className="aspect-square w-full object-cover" />
        </div>
        <div className="mt-4 space-y-2 text-sm text-[#c2c6d6]">
          <div className="font-semibold text-[#e1e2ec]">{job.request.text}</div>
          <div>{job.request.styleId} / {job.request.primaryMetal}{job.request.secondaryMetal ? ` + ${job.request.secondaryMetal}` : ""}</div>
          <div>Emblem: {job.request.emblem}</div>
        </div>
      </div>

      <div className="min-w-0 rounded-xl border border-white/5 bg-[#17191F] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8c909f]">Video Job</p>
            <h1 className="mt-2 text-2xl font-bold text-[#e1e2ec]">{statusLabel(job.status)}</h1>
          </div>
          <span className="rounded-full border border-[#f7bc5f]/30 bg-[#1D120C] px-3 py-1 text-xs font-semibold text-[#f7bc5f]">
            {job.status}
          </span>
        </div>

        {!job.done && (
          <div className="mt-6">
            <div className="h-3 overflow-hidden rounded-full bg-black/55">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-[#3B82F6]" />
            </div>
            <p className="mt-3 text-sm text-[#8c909f]">Wavespeed is generating the product video. This page updates automatically.</p>
          </div>
        )}

        {job.status === "failed" && (
          <div className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            {job.error ?? "Video generation failed."}
          </div>
        )}

        {job.videoUrl && (
          <div className="mt-6">
            <video src={job.videoUrl} controls playsInline className="aspect-video w-full rounded-lg bg-black" />
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={job.videoUrl} download className="rounded-full bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white hover:bg-blue-400">
                Download
              </a>
              <button type="button" onClick={handleShare} className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-[#e1e2ec] hover:bg-white/10">
                {copyLabel}
              </button>
            </div>
            {job.durationSeconds && (
              <p className="mt-3 text-xs text-[#8c909f]">Generated in {job.durationSeconds.toFixed(2)} seconds.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
