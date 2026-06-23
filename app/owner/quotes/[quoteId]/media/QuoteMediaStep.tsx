"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MediaType = "image" | "model3d" | "video";
type Job = { id: string; status: string; error: string | null } | null;

const MEDIA_OPTIONS: Array<{ type: MediaType; title: string; description: string }> = [
  { type: "image", title: "Image only", description: "Use the selected generation without creating another paid asset." },
  { type: "model3d", title: "Image + 3D", description: "Create an interactive model that customers can rotate and view in AR." },
  { type: "video", title: "Image + Video", description: "Create a short motion preview from the selected generation." }
];

export default function QuoteMediaStep({
  quoteId,
  title,
  imageUrl,
  canGenerate3d,
  canGenerateVideo,
  initialMediaType,
  initialModelJob,
  initialVideoJob
}: {
  quoteId: string;
  title: string;
  imageUrl: string | null;
  canGenerate3d: boolean;
  canGenerateVideo: boolean;
  initialMediaType: MediaType;
  initialModelJob: Job;
  initialVideoJob: Job;
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<MediaType>(initialMediaType);
  const [job, setJob] = useState<Job>(initialMediaType === "model3d" ? initialModelJob : initialMediaType === "video" ? initialVideoJob : null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publishQuote(previewMediaType: MediaType) {
    const response = await fetch(`/api/quote-requests/${quoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ previewMediaType, status: "sent" })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Unable to finish this quote.");
    router.push(`/owner/quotes/${quoteId}/preview`);
    router.refresh();
  }

  useEffect(() => {
    if (!job || (job.status !== "pending" && job.status !== "processing")) return;
    const endpoint = selection === "model3d" ? `/api/owner/model-jobs/${job.id}` : `/api/owner/video-jobs/${job.id}`;
    let cancelled = false;
    let timeout: number | null = null;
    const controller = new AbortController();

    async function poll() {
      try {
        const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
        if (!response.ok || cancelled) return;
        const data = await response.json();
        if (cancelled) return;
        setJob({ id: data.id, status: data.status, error: data.error ?? null });
        if (data.status === "pending" || data.status === "processing") {
          timeout = window.setTimeout(poll, 3000);
        }
      } catch (cause) {
        if (!cancelled && !(cause instanceof DOMException && cause.name === "AbortError")) {
          timeout = window.setTimeout(poll, 3000);
        }
      }
    }

    timeout = window.setTimeout(poll, 3000);
    return () => {
      cancelled = true;
      controller.abort();
      if (timeout) window.clearTimeout(timeout);
    };
  }, [job, selection]);

  useEffect(() => {
    if (job?.status !== "succeeded" || submitting || (selection !== "model3d" && selection !== "video")) return;
    setSubmitting(true);
    publishQuote(selection).catch(cause => {
      setError(cause instanceof Error ? cause.message : "Unable to finish this quote.");
      setSubmitting(false);
    });
  }, [job?.status, selection, submitting]);

  async function continueFlow() {
    setSubmitting(true);
    setError(null);
    try {
      if (selection === "image") {
        await publishQuote("image");
        return;
      }
      const endpoint = selection === "model3d" ? "/api/owner/model-jobs" : "/api/owner/video-jobs";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? `Unable to start ${selection === "model3d" ? "3D" : "video"} generation.`);
      setJob({
        id: selection === "model3d" ? data.modelJobId : data.videoJobId,
        status: data.status ?? "pending",
        error: null
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to continue.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedUnsupported = (selection === "model3d" && !canGenerate3d) || (selection === "video" && !canGenerateVideo);
  const jobInProgress = job && (job.status === "pending" || job.status === "processing");

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#17191F]">
        {imageUrl ? <img src={imageUrl} alt={`${title} selected quote design`} className="aspect-square w-full object-cover" /> : <div className="flex aspect-square items-center justify-center p-8 text-sm text-[#8c909f]">No selected image</div>}
        <div className="p-4"><p className="text-xs uppercase tracking-[0.22em] text-[#D1B873]">Selected design</p><h1 className="mt-2 break-words text-2xl font-bold text-white">{title}</h1></div>
      </div>

      <div className="rounded-2xl border border-[#D1B873]/20 bg-[#17191F] p-5 md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#D1B873]">Customer preview</p>
        <h2 className="mt-2 text-3xl font-bold text-white">Add an optional preview asset</h2>
        <p className="mt-2 text-sm leading-6 text-[#c2c6d6]">The quote link stays private until the selected asset is ready. Image only is the default.</p>

        <div className="mt-6 grid gap-3">
          {MEDIA_OPTIONS.map(option => {
            const disabled = (option.type === "model3d" && !canGenerate3d) || (option.type === "video" && !canGenerateVideo);
            return (
              <button key={option.type} type="button" disabled={disabled || Boolean(jobInProgress)} onClick={() => { setSelection(option.type); setJob(option.type === "model3d" ? initialModelJob : option.type === "video" ? initialVideoJob : null); setError(null); }} className={`rounded-2xl border p-4 text-left transition ${selection === option.type ? "border-[#D1B873] bg-[#D1B873]/10" : "border-white/10 bg-black/20 hover:border-white/25"} disabled:cursor-not-allowed disabled:opacity-45`}>
                <span className="block font-semibold text-white">{option.title}</span>
                <span className="mt-1 block text-sm leading-5 text-[#9ba3b4]">{option.description}{disabled ? " Not available for this product type yet." : ""}</span>
              </button>
            );
          })}
        </div>

        {job ? (
          <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${job.status === "failed" ? "border-red-400/30 bg-red-500/10 text-red-100" : "border-[#D1B873]/25 bg-[#D1B873]/10 text-[#f3d98f]"}`}>
            {job.status === "succeeded" ? "Asset ready. Opening the quote preview..." : job.status === "failed" ? job.error ?? "Generation failed. Choose another option or retry." : "Generating the preview asset. Keep this page open; it updates automatically."}
          </div>
        ) : null}
        {error ? <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

        <button type="button" onClick={continueFlow} disabled={submitting || selectedUnsupported || Boolean(jobInProgress)} className="mt-6 h-14 w-full rounded-2xl bg-[#3B82F6] px-5 text-base font-semibold text-white transition hover:bg-blue-400 disabled:cursor-wait disabled:opacity-55">
          {submitting ? "Working..." : selection === "image" ? "Continue with Image Only" : job?.status === "failed" ? "Retry Generation" : `Generate ${selection === "model3d" ? "3D" : "Video"}`}
        </button>
      </div>
    </section>
  );
}
