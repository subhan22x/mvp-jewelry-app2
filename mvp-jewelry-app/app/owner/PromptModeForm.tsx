"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PromptMode } from "@/src/lib/prompt-mode";

type Props = {
  initialMode: PromptMode;
};

const OPTIONS: Array<{ value: PromptMode; label: string; description: string }> = [
  {
    value: "json",
    label: "JSON prompts",
    description: "Use the structured prompt templates currently used by all name styles."
  },
  {
    value: "natural_language",
    label: "Natural language",
    description: "Use natural-language templates when a style supports them. Gatti is configured first."
  }
];

export default function PromptModeForm({ initialMode }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<PromptMode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function updateMode(nextMode: PromptMode) {
    setMode(nextMode);
    setError(null);

    try {
      const response = await fetch("/api/owner-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptMode: nextMode })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Unable to update prompt mode.");
      startTransition(() => router.refresh());
    } catch (err) {
      setMode(initialMode);
      setError(err instanceof Error ? err.message : "Unable to update prompt mode.");
    }
  }

  return (
    <section className="rounded-2xl border border-[#D1B873]/15 bg-[#17191F] p-4 shadow-[0_12px_34px_rgba(0,0,0,0.2)]">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#D1B873]">Prompt System</p>
        <h2 className="text-lg font-bold text-[#e1e2ec]">Name Pendant Prompt Mode</h2>
        <p className="text-sm text-[#8c909f]">Choose which prompt format new name generations use.</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {OPTIONS.map(option => {
          const active = mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => void updateMode(option.value)}
              disabled={isPending || active}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-[#D1B873]/60 bg-[#56450a]/45 text-[#dec47e]"
                  : "border-white/10 bg-black/25 text-[#e1e2ec] hover:border-white/25 hover:bg-white/[0.03]"
              }`}
            >
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="mt-1 block text-xs leading-relaxed text-[#8c909f]">{option.description}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      )}
    </section>
  );
}
