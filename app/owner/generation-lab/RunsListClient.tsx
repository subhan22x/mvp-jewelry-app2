"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CaseEditor, { type AnyCaseConfig, type LabMeta } from "./CaseEditor";
import { LAB_PRESETS } from "@/src/lib/generation-lab/presets";
import { expectedGenerationsForFamily } from "@/src/lib/generation-lab/types";

type RunSummary = {
  id: string;
  label: string;
  notes: string | null;
  status: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  caseCount: number;
};

function formatDate(value: string | null) {
  if (!value) return "n/a";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === "completed") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";
  if (status === "running") return "border-blue-300/30 bg-blue-400/10 text-blue-200";
  if (status === "failed") return "border-red-300/30 bg-red-400/10 text-red-200";
  return "border-white/10 bg-white/5 text-[#c2c6d6]";
}

const inputClass = "w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-[#e1e2ec] outline-none focus:border-white/30";

function defaultNameCase(): AnyCaseConfig {
  return { family: "name", styleId: "lexy", text: "Alyssa", pendantFinish: "icedout", twoTone: false, primaryMetal: "yellow_gold", secondaryMetal: null, emblem: "none" };
}

export default function RunsListClient() {
  const [meta, setMeta] = useState<LabMeta | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [cases, setCases] = useState<AnyCaseConfig[]>([defaultNameCase()]);
  const [creating, setCreating] = useState(false);

  const expectedGens = useMemo(
    () => cases.reduce((sum, c) => sum + expectedGenerationsForFamily(c.family as any), 0),
    [cases]
  );
  const overBudget = expectedGens > 10;

  async function loadMeta() {
    const res = await fetch("/api/owner/generation-lab/meta");
    if (res.ok) setMeta(await res.json());
  }
  async function loadRuns() {
    const res = await fetch("/api/owner/generation-lab/runs");
    if (res.ok) {
      const data = await res.json();
      setRuns(data.runs ?? []);
    }
  }

  useEffect(() => {
    Promise.all([loadMeta(), loadRuns()]).finally(() => setLoading(false));
  }, []);

  function applyPreset(presetId: string) {
    const preset = LAB_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setCases(preset.cases.map(c => ({ ...c }) as AnyCaseConfig));
    if (!label) setLabel(preset.label);
  }

  async function handleCreate() {
    setError(null);
    if (!label.trim()) { setError("Label is required."); return; }
    if (cases.length === 0) { setError("Add at least one case."); return; }
    if (overBudget) { setError(`Run would generate ${expectedGens} images (max 10).`); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/owner/generation-lab/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), notes: notes.trim() || undefined, cases })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to create run.");
      setLabel("");
      setNotes("");
      setCases([defaultNameCase()]);
      await loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create run.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <div className="px-4 py-12 text-center text-sm text-[#8c909f]">Loading generation lab…</div>;
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-8 px-4 py-8 md:px-6">
      <section>
        <h1 className="text-[28px] font-bold tracking-tight text-[#e1e2ec]">Generation Lab</h1>
        <p className="mt-2 text-sm text-[#c2c6d6]">
          Internal owner-only batch generation for customer design wizard families. Persists normal Request/Result rows so outputs stay quote-eligible. Real API only — each run is capped at 10 image generations.
        </p>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#17191F] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#f7bc5f]">New run</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8c909f]">Label</span>
            <input className={inputClass} value={label} onChange={e => setLabel(e.target.value)} placeholder="Lexy two-tone smoke" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8c909f]">Notes (optional)</span>
            <input className={inputClass} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What is this run checking?" />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8c909f]">Presets:</span>
          {meta?.presets.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] text-[#c2c6d6] transition hover:border-white/30 hover:text-[#e1e2ec]"
              title={preset.description}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {cases.map((cfg, index) => (
            <CaseEditor
              key={index}
              index={index}
              config={cfg}
              meta={meta!}
              onChange={next => setCases(prev => prev.map((c, i) => i === index ? next : c))}
              onRemove={() => setCases(prev => prev.filter((_, i) => i !== index))}
            />
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setCases(prev => [...prev, defaultNameCase()])}
            className="rounded-md border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-[#c2c6d6] transition hover:border-white/30"
          >
            + Add case
          </button>
          <div className="flex items-center gap-3">
            <span className={`text-xs ${overBudget ? "text-red-300" : "text-[#8c909f]"}`}>
              {expectedGens} / 10 generations
            </span>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || overBudget || !label.trim()}
              className="rounded-md bg-[#3B82F6] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create run"}
            </button>
          </div>
        </div>
        {error && <div className="mt-3 rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs text-red-200">{error}</div>}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8c909f]">Recent runs</h2>
        {runs.length === 0 ? (
          <div className="mt-3 rounded-xl border border-white/5 bg-[#17191F] p-6 text-center text-sm text-[#8c909f]">No runs yet. Create one above.</div>
        ) : (
          <div className="mt-3 grid gap-2">
            {runs.map(run => (
              <Link
                key={run.id}
                href={`/owner/generation-lab/${run.id}`}
                className="flex flex-col gap-2 rounded-lg border border-white/10 bg-[#17191F] p-3 transition hover:border-white/25 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-[#e1e2ec]">{run.label}</span>
                    <span className={`flex-shrink-0 rounded border px-2 py-0.5 text-[10px] ${statusClass(run.status)}`}>{run.status}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#8c909f]">
                    {run.caseCount} case{run.caseCount === 1 ? "" : "s"} · created {formatDate(run.createdAt)}
                  </div>
                </div>
                <span className="text-[11px] text-[#8c909f] sm:text-right">{run.notes ?? ""}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
