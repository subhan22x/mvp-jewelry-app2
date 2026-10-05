"use client";

import type { CustomerDesignResult } from "./CustomerResultsScreen";

// Mirrors the iced-out pendant revision dialog.
export default function CustomerResultEditDialog({ result, prompt, remaining, submitting, error, onPromptChange, onClose, onSubmit }: {
  result: CustomerDesignResult;
  prompt: string;
  remaining: number;
  submitting: boolean;
  error: string | null;
  onPromptChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true" aria-label={`Edit ${result.label}`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <form onSubmit={event => { event.preventDefault(); onSubmit(); }} className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#1d120c] shadow-2xl">
        <div className="max-h-[58vh] overflow-hidden bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.src ?? ""} alt={`${result.label} selected for editing`} className="mx-auto block max-h-[58vh] w-full object-contain" />
        </div>
        <div className="space-y-4 p-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Describe the changes</h2>
            <p className="mt-1 text-sm text-white/60">You can create {remaining} more revision{remaining === 1 ? "" : "s"} for this design.</p>
          </div>
          <label className="block text-sm text-white/70">Revision notes
            <textarea value={prompt} onChange={event => onPromptChange(event.target.value)} autoFocus rows={4} maxLength={800} placeholder="e.g. make the logo larger and the diamond border thinner" className="mt-2 w-full resize-none rounded-2xl border border-white/15 bg-black/45 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-sky-400" />
          </label>
          {error && <div role="alert" className="rounded-2xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-2xl border border-white/15 bg-black/45 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/35">cancel</button>
            <button type="submit" disabled={!prompt.trim() || submitting} className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${prompt.trim() && !submitting ? "bg-sky-500 text-white hover:bg-sky-400" : "cursor-not-allowed border border-white/15 bg-black/45 text-white/50"}`}>{submitting ? "creating..." : "create revision"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
