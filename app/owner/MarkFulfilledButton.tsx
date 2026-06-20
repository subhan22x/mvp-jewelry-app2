"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function MarkFulfilledButton({ quoteId, disabled }: { quoteId: string; disabled?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function markFulfilled() {
    setError(null);
    const response = await fetch(`/api/quote-requests/${quoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "fulfilled" }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Unable to mark fulfilled.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || isPending}
        onClick={markFulfilled}
        className="flex h-14 w-full items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-400/10 px-5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Updating..." : "Mark Fulfilled"}
      </button>
      {error && <p className="text-center text-xs text-red-200">{error}</p>}
    </div>
  );
}
