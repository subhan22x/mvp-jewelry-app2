"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  resultId: string;
  attemptCount: number;
  existingModelJobId?: string | null;
  existingModelStatus?: string | null;
  hasSucceededModel?: boolean;
  disabled?: boolean;
};

export default function View3dButton({
  resultId,
  attemptCount,
  existingModelJobId = null,
  existingModelStatus = null,
  hasSucceededModel = false,
  disabled = false
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAttempts = attemptCount > 0;
  const canViewExisting = Boolean(existingModelJobId && (hasSucceededModel || existingModelStatus === "pending"));
  const isRetry = hasAttempts && !canViewExisting;
  const label = hasSucceededModel
    ? "View 3D model"
    : existingModelStatus === "pending"
      ? "View 3D generation"
      : isRetry
        ? "Retry 3D generation"
        : "Generate in 3D";

  async function startModelGeneration() {
    setSubmitting(true);
    setConfirming(false);
    setError(null);
    try {
      const response = await fetch("/api/owner/model-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Unable to start 3D generation.");
      router.push(`/owner/models/${data.modelJobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start 3D generation.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <button
        type="button"
        onClick={() => {
          setError(null);
          if (canViewExisting && existingModelJobId) {
            router.push(`/owner/models/${existingModelJobId}`);
            return;
          }
          setConfirming(true);
        }}
        disabled={disabled || submitting}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-full border border-[#f7bc5f]/40 bg-transparent px-5 text-sm font-semibold text-[#f7bc5f] transition hover:bg-[#f7bc5f]/10 disabled:cursor-wait disabled:opacity-60"
      >
        {submitting ? "Starting..." : label}
        {!hasSucceededModel && (
          <span className="rounded-full bg-[#f7bc5f]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">Beta</span>
        )}
      </button>
      {confirming && (
        <div className="rounded-lg border border-[#f7bc5f]/40 bg-[#1D120C] p-3 text-xs text-[#f7bc5f]">
          <p className="font-semibold">{isRetry ? "Generate a new 3D model?" : "Generate in 3D?"}</p>
          <p className="mt-1 leading-relaxed text-[#dec47e]">
            {isRetry
              ? "The previous 3D attempt did not finish. A retry uses paid Rodin processing."
              : "This creates a persistent 3D model file for this draft and uses paid Rodin processing."}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={startModelGeneration}
              disabled={submitting}
              className="rounded-full bg-[#f7bc5f] px-3 py-1.5 font-semibold text-[#101114] hover:bg-[#ffd88a] disabled:cursor-wait disabled:opacity-60"
            >
              {isRetry ? "Retry now" : "Generate"}
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
          {hasSucceededModel
            ? "3D model saved for this draft."
            : existingModelStatus === "pending"
              ? "3D generation is still processing."
              : `3D attempt${attemptCount === 1 ? "" : "s"}: ${attemptCount}`}
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
