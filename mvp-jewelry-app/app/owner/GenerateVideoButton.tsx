"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  resultId: string;
  attemptCount: number;
  completedCount: number;
  disabled?: boolean;
  labelOverride?: string;
};

export default function GenerateVideoButton({ resultId, attemptCount, completedCount, disabled = false, labelOverride }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAttempts = attemptCount > 0;
  const label = labelOverride ?? (completedCount > 0
    ? "Generate another video"
    : hasAttempts
      ? "Generate again"
      : "Generate Video");

  async function startVideoGeneration() {
    setSubmitting(true);
    setConfirming(false);
    setError(null);
    try {
      const response = await fetch("/api/owner/video-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Unable to start video generation.");
      router.push(`/owner/videos/${data.videoJobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start video generation.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <button
        type="button"
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        disabled={disabled || submitting}
        className="min-h-10 rounded-lg bg-[#3B82F6] px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-400 disabled:cursor-wait disabled:opacity-60"
      >
        {submitting ? "Starting..." : label}
      </button>
      {confirming && (
        <div className="rounded-lg border border-[#f7bc5f]/40 bg-[#1D120C] p-3 text-xs text-[#f7bc5f]">
          <p className="font-semibold">Are you sure?</p>
          <p className="mt-1 leading-relaxed text-[#dec47e]">Generating a video uses paid Wavespeed processing.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={startVideoGeneration}
              disabled={submitting}
              className="rounded-full bg-[#f7bc5f] px-3 py-1.5 font-semibold text-[#101114] hover:bg-[#ffd88a] disabled:cursor-wait disabled:opacity-60"
            >
              Yes, generate
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={submitting}
              className="rounded-full border border-[#f7bc5f]/30 px-3 py-1.5 font-semibold text-[#dec47e] hover:bg-white/5 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {hasAttempts && (
        <span className="text-[10px] leading-snug text-[#8c909f]">
          Pressed before: {attemptCount} job{attemptCount === 1 ? "" : "s"}
        </span>
      )}
      {error && (
        <span className="rounded border border-red-400/30 bg-red-500/10 px-2 py-1 text-[10px] leading-snug text-red-100">
          {error}
        </span>
      )}
    </div>
  );
}
