"use client";

import { useEffect, useMemo, useState } from "react";

type ModelJob = {
  id: string;
  sourceImageUrl: string;
  modelUrl: string | null;
  format: string;
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
  initialJob: ModelJob;
};

function statusLabel(status: string) {
  if (status === "succeeded") return "Ready";
  if (status === "failed") return "Failed";
  return "Generating";
}

export default function Model3dViewer({ initialJob }: Props) {
  const [job, setJob] = useState(initialJob);
  const [copyLabel, setCopyLabel] = useState("Share");
  const [viewerReady, setViewerReady] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return job.modelUrl ?? "";
    return window.location.href;
  }, [job.modelUrl]);

  // Register the <model-viewer> custom element on the client only.
  useEffect(() => {
    let cancelled = false;
    import("@google/model-viewer")
      .then(() => {
        if (!cancelled) setViewerReady(true);
      })
      .catch(() => {
        if (!cancelled) setViewerReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (job.done) return;

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/owner/model-jobs/${job.id}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setJob(data);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [job.done, job.id]);

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title: "Pendant in 3D", url: shareUrl });
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
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8c909f]">3D Model</p>
            <h1 className="mt-2 text-2xl font-bold text-[#e1e2ec]">{statusLabel(job.status)}</h1>
          </div>
          <span className="rounded-full border border-[#f7bc5f]/30 bg-[#1D120C] px-3 py-1 text-xs font-semibold text-[#f7bc5f]">
            {job.status}
          </span>
        </div>

        {!job.done && (
          <div className="mt-6">
            <div className="h-3 overflow-hidden rounded-full bg-black/55">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-[#f7bc5f]" />
            </div>
            <p className="mt-3 text-sm text-[#8c909f]">Rodin is reconstructing a 3D model from this image. This page updates automatically.</p>
          </div>
        )}

        {job.status === "failed" && (
          <div className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            {job.error ?? "3D generation failed."}
          </div>
        )}

        {job.modelUrl && (
          <div className="mt-6">
            {viewerReady ? (
              <model-viewer
                src={job.modelUrl}
                poster={job.sourceImageUrl}
                alt={`${job.request.text} pendant in 3D`}
                reveal="auto"
                camera-controls
                auto-rotate
                touch-action="pan-y"
                ar
                ar-modes="webxr scene-viewer quick-look"
                shadow-intensity="1"
                onLoad={() => setViewerError(null)}
                onError={() => setViewerError("The 3D model could not be loaded in this browser.")}
                style={{ width: "100%", height: "70vh", borderRadius: "0.5rem", background: "#000" }}
              >
                <button
                  slot="ar-button"
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-[#f7bc5f] px-5 py-3 text-sm font-semibold text-[#101114] shadow-lg"
                >
                  View in your space (AR)
                </button>
              </model-viewer>
            ) : (
              <div className="flex h-[70vh] items-center justify-center rounded-lg border border-white/10 bg-black text-sm text-[#8c909f]">
                Loading 3D viewer…
              </div>
            )}
            {viewerError && (
              <p className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                {viewerError}
              </p>
            )}
            <p className="mt-3 text-xs text-[#8c909f]">
              Drag to rotate, pinch to zoom. On a phone, tap <span className="text-[#dec47e]">View in your space</span> to place it in AR.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={job.modelUrl} download className="rounded-full bg-[#f7bc5f] px-5 py-3 text-sm font-semibold text-[#101114] hover:bg-[#ffd88a]">
                Download {job.format.toUpperCase()}
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
