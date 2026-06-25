"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { expectedGenerationsForFamily, parseCaseConfigOrNull } from "@/src/lib/generation-lab/types";

type ResultRow = {
  id: string;
  variant: number;
  status: string;
  imageUrl: string | null;
  prompt: string;
  modelId: string | null;
  error: string | null;
  durationMs: number | null;
  attachmentPathsJson: string | null;
  completedAt: string | null;
};

type ReviewRow = {
  id: string;
  resultId: string;
  variant: number;
  status: string;
  failureTagsJson: string | null;
  notes: string | null;
};

type CaseRow = {
  id: string;
  sortOrder: number;
  family: string;
  configJson: string;
  status: string;
  error: string | null;
  requestId: string | null;
  sourceStylePath: string | null;
  sourceTemplatePath: string | null;
  renderedConfigJson: string | null;
  startedAt: string | null;
  completedAt: string | null;
  results: ResultRow[];
  reviews: ReviewRow[];
};

type RunDetail = {
  id: string;
  label: string;
  notes: string | null;
  status: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cases: CaseRow[];
};

const FAILURE_TAGS = ["bad_text", "bad_shape", "bad_composition", "bad_lighting", "wrong_background", "wrong_style", "bad_emblem", "bad_metal", "cropped", "provider_error"];

function formatDate(value: string | null) {
  if (!value) return "n/a";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function parseTags(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

function parseConfig(json: string | null): Record<string, unknown> | null {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

function parseRendered(json: string | null): { variants?: Array<{ variant: number; prompt: string; attachments: string[] }> } | null {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

function statusClass(status: string) {
  if (status === "succeeded" || status === "completed") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";
  if (status === "running" || status === "pending") return "border-blue-300/30 bg-blue-400/10 text-blue-200";
  if (status === "failed") return "border-red-300/30 bg-red-400/10 text-red-200";
  if (status === "partial") return "border-amber-300/30 bg-amber-400/10 text-amber-200";
  if (status === "skipped") return "border-white/10 bg-white/5 text-[#8c909f]";
  return "border-white/10 bg-white/5 text-[#c2c6d6]";
}

function relativePath(p: string | null): string {
  if (!p) return "";
  const cwd = typeof process !== "undefined" && process.cwd ? process.cwd() : "";
  if (cwd && p.startsWith(cwd)) return p.slice(cwd.length + 1);
  return p;
}

function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function attachmentImageUrl(pathValue: string): string {
  if (/^https?:\/\//i.test(pathValue)) return pathValue;
  if (pathValue.startsWith("/")) return `/internal/generations/reference-image?p=${base64UrlEncode(pathValue)}`;
  if (pathValue.startsWith("public/")) return `/${pathValue.slice("public/".length)}`;
  return `/internal/generations/reference-image?p=${base64UrlEncode(pathValue)}`;
}

export default function RunDetailClient({ runId }: { runId: string }) {
  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/owner/generation-lab/runs/${runId}`);
    if (res.status === 404) { setError("Run not found."); setLoading(false); return; }
    if (!res.ok) { setError("Failed to load run."); setLoading(false); return; }
    const data = (await res.json()) as RunDetail;
    setRun(data);
    setLoading(false);
  }, [runId]);

  useEffect(() => { void load(); }, [load]);

  // Poll while running.
  useEffect(() => {
    if (!run || run.status !== "running") return;
    const t = setTimeout(() => { void load(); }, 3000);
    return () => clearTimeout(t);
  }, [run, load]);

  async function handleStart() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/generation-lab/runs/${runId}/start`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to start run.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start run.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePatchReview(resultId: string, patch: { status?: string; failureTags?: string[]; notes?: string | null }) {
    const res = await fetch(`/api/owner/generation-lab/reviews/${resultId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (res.ok) await load();
  }

  async function handleDelete() {
    if (!confirm("Delete this run and all its cases/reviews? Generated Request/Result rows are preserved.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/owner/generation-lab/runs/${runId}`, { method: "DELETE" });
      if (res.ok) { window.location.href = "/owner/generation-lab"; return; }
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error ?? "Failed to delete run.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete run.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="px-4 py-12 text-center text-sm text-[#8c909f]">Loading run…</div>;
  if (error && !run) return <div className="px-4 py-12 text-center text-sm text-red-300">{error}</div>;
  if (!run) return null;

  const actualGenerationCount = run.cases.reduce((sum, labCase) => sum + labCase.results.length, 0);
  const expectedGenerationCount = run.cases.reduce((sum, labCase) => {
    const config = parseCaseConfigOrNull(labCase.configJson);
    return sum + (config ? expectedGenerationsForFamily(config.family) : 0);
  }, 0);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs text-[#8c909f]">
          <Link href="/owner/generation-lab" className="hover:text-[#e1e2ec]">← Generation Lab</Link>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="break-words text-[26px] font-bold tracking-tight text-[#e1e2ec]">{run.label}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#8c909f]">
              <span className={`rounded border px-2 py-0.5 ${statusClass(run.status)}`}>{run.status}</span>
              <span>created {formatDate(run.createdAt)}</span>
              <span>· started {formatDate(run.startedAt)}</span>
              <span>· completed {formatDate(run.completedAt)}</span>
              <span>· {run.cases.length} case{run.cases.length === 1 ? "" : "s"}</span>
              <span>· {actualGenerationCount} of {expectedGenerationCount} generation{expectedGenerationCount === 1 ? "" : "s"}</span>
            </div>
            {run.notes && <p className="mt-2 text-sm text-[#c2c6d6]">{run.notes}</p>}
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            <a
              href={`/api/owner/generation-lab/runs/${run.id}/export`}
              className="rounded-md border border-white/15 bg-black/30 px-3 py-1.5 text-xs font-semibold text-[#c2c6d6] transition hover:border-white/30"
            >
              Export CSV
            </a>
            <button
              type="button"
              onClick={handleStart}
              disabled={busy || run.status === "running"}
              className="rounded-md bg-[#3B82F6] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {run.status === "running" ? "Running…" : run.status === "completed" || run.status === "failed" ? "Re-run" : "Start run"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy || run.status === "running"}
              className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
        {error && <div className="rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs text-red-200">{error}</div>}
      </section>

      <section className="flex flex-col gap-4">
        {run.cases.map((labCase, index) => (
          <CaseDetail
            key={labCase.id}
            index={index}
            labCase={labCase}
            onPatchReview={handlePatchReview}
          />
        ))}
        {run.cases.length === 0 && (
          <div className="rounded-xl border border-white/5 bg-[#17191F] p-6 text-center text-sm text-[#8c909f]">No cases on this run.</div>
        )}
      </section>
    </div>
  );
}

function CaseDetail({ index, labCase, onPatchReview }: {
  index: number;
  labCase: CaseRow;
  onPatchReview: (resultId: string, patch: { status?: string; failureTags?: string[]; notes?: string | null }) => Promise<void>;
}) {
  const config = useMemo(() => parseConfig(labCase.configJson), [labCase.configJson]);
  const rendered = useMemo(() => parseRendered(labCase.renderedConfigJson), [labCase.renderedConfigJson]);
  const configForCopy = useMemo(() => JSON.stringify(config, null, 2), [config]);

  const [copied, setCopied] = useState(false);
  function copyConfig() {
    navigator.clipboard?.writeText(configForCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }

  const textPreview = typeof config?.text === "string" ? config.text : typeof config?.family === "string" ? config.family : "";

  return (
    <div className="rounded-xl border border-white/10 bg-[#17191F] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#f7bc5f]">Case {index + 1}</span>
            <span className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-[#c2c6d6]">{labCase.family}</span>
            <span className={`rounded border px-2 py-0.5 text-[10px] ${statusClass(labCase.status)}`}>{labCase.status}</span>
            {textPreview && <span className="truncate text-xs text-[#8c909f]">· “{textPreview}”</span>}
          </div>
          {labCase.error && <p className="mt-1 text-[11px] text-red-300/80">{labCase.error}</p>}
          {labCase.requestId && (
            <p className="mt-1 text-[11px] text-[#8c909f]">
              request <Link href={`/owner?filter=all&q=${labCase.requestId}`} className="underline hover:text-[#e1e2ec]">{labCase.requestId}</Link>
            </p>
          )}
        </div>
        <button type="button" onClick={copyConfig} className="flex-shrink-0 rounded-md border border-white/15 bg-black/30 px-2.5 py-1 text-[10px] font-semibold text-[#c2c6d6] transition hover:border-white/30">
          {copied ? "Copied!" : "Copy config"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {labCase.results.length === 0 ? (
          <div className="col-span-full rounded-md border border-white/5 bg-black/20 p-4 text-center text-xs text-[#8c909f]">
            No results yet. {labCase.status === "pending" ? "Start the run to generate." : "Generation did not produce results."}
          </div>
        ) : (
          labCase.results.map(result => {
            const review = labCase.reviews.find(r => r.resultId === result.id);
            const renderedVariant = rendered?.variants?.find(v => v.variant === result.variant);
            return (
              <ResultCard
                key={result.id}
                result={result}
                review={review ?? null}
                renderedVariant={renderedVariant ?? null}
                sourceStylePath={labCase.sourceStylePath}
                sourceTemplatePath={labCase.sourceTemplatePath}
                onPatchReview={onPatchReview}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function ResultCard({ result, review, renderedVariant, sourceStylePath, sourceTemplatePath, onPatchReview }: {
  result: ResultRow;
  review: ReviewRow | null;
  renderedVariant: { variant: number; prompt: string; attachments: string[] } | null;
  sourceStylePath: string | null;
  sourceTemplatePath: string | null;
  onPatchReview: (resultId: string, patch: { status?: string; failureTags?: string[]; notes?: string | null }) => Promise<void>;
}) {
  const [notes, setNotes] = useState(review?.notes ?? "");
  const [tags, setTags] = useState<string[]>(parseTags(review?.failureTagsJson ?? null));
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setNotes(review?.notes ?? "");
    setTags(parseTags(review?.failureTagsJson ?? null));
  }, [review?.notes, review?.failureTagsJson]);

  const prompt = result.prompt || renderedVariant?.prompt || "";
  const attachments: string[] = useMemo(() => {
    if (result.attachmentPathsJson) {
      try { const parsed = JSON.parse(result.attachmentPathsJson); return Array.isArray(parsed) ? parsed : []; } catch {}
    }
    return renderedVariant?.attachments ?? [];
  }, [result.attachmentPathsJson, renderedVariant]);

  function toggleTag(tag: string) {
    setTags(prev => {
      const next = prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag];
      void onPatchReview(result.id, { failureTags: next });
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8c909f]">Variant {result.variant}</span>
          <span className={`rounded border px-1.5 py-0.5 text-[10px] ${statusClass(result.status)}`}>{result.status}</span>
        </div>
        {result.durationMs !== null && <span className="text-[10px] text-[#8c909f]">{(result.durationMs / 1000).toFixed(1)}s</span>}
      </div>

      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-md bg-black">
        {result.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result.imageUrl} alt={`Variant ${result.variant}`} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-white/30">
            {result.status === "pending" ? "Generating…" : result.status === "failed" ? "Failed" : "No image"}
          </div>
        )}
      </div>

      {attachments.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {attachments.map((attachment, index) => (
            <a
              key={`${attachment}-${index}`}
              href={attachmentImageUrl(attachment)}
              target="_blank"
              rel="noreferrer"
              title={relativePath(attachment)}
              className="group flex min-w-0 flex-col gap-1"
            >
              <span className="relative aspect-square overflow-hidden rounded-md border border-white/10 bg-black/40 transition group-hover:border-white/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachmentImageUrl(attachment)}
                  alt={`Attachment ${index + 1}`}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </span>
              <span className="truncate text-[9px] text-[#8c909f]">Attachment {index + 1}</span>
            </a>
          ))}
        </div>
      )}

      {result.error && <p className="text-[11px] text-red-300/80">{result.error}</p>}

      {/* Review controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void onPatchReview(result.id, { status: "pass" })}
          className={`rounded border px-2.5 py-1 text-[11px] font-semibold transition ${review?.status === "pass" ? "border-emerald-300/40 bg-emerald-400/20 text-emerald-200" : "border-white/10 bg-black/30 text-[#c2c6d6] hover:border-white/30"}`}
        >
          Pass
        </button>
        <button
          type="button"
          onClick={() => void onPatchReview(result.id, { status: "fail" })}
          className={`rounded border px-2.5 py-1 text-[11px] font-semibold transition ${review?.status === "fail" ? "border-red-300/40 bg-red-400/20 text-red-200" : "border-white/10 bg-black/30 text-[#c2c6d6] hover:border-white/30"}`}
        >
          Fail
        </button>
        <button
          type="button"
          onClick={() => void onPatchReview(result.id, { status: "unreviewed" })}
          className="rounded border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] text-[#8c909f] transition hover:border-white/30"
        >
          Reset
        </button>
      </div>

      {review?.status === "fail" && (
        <div className="flex flex-wrap gap-1">
          {FAILURE_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded-full border px-2 py-0.5 text-[10px] transition ${tags.includes(tag) ? "border-red-300/40 bg-red-400/20 text-red-200" : "border-white/10 bg-black/30 text-[#8c909f] hover:border-white/30"}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8c909f]">Notes</span>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={() => { if ((notes ?? "") !== (review?.notes ?? "")) void onPatchReview(result.id, { notes }); }}
          rows={2}
          className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-[#e1e2ec] outline-none focus:border-white/30"
          placeholder="Optional notes"
        />
      </label>

      {/* Source paths */}
      <div className="space-y-1 text-[10px] text-[#8c909f]">
        {sourceStylePath && <div><span className="font-semibold">style.yml:</span> {relativePath(sourceStylePath)}</div>}
        {sourceTemplatePath && <div><span className="font-semibold">template:</span> {relativePath(sourceTemplatePath)}</div>}
        {result.modelId && <div><span className="font-semibold">model:</span> {result.modelId}</div>}
      </div>

      {/* Prompt + attachments */}
      <div className="rounded-md border border-white/5 bg-black/30 p-2">
        <button type="button" onClick={() => setExpanded(e => !e)} className="flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[#8c909f]">
          <span>Prompt &amp; attachments</span>
          <span>{expanded ? "−" : "+"}</span>
        </button>
        {expanded && (
          <div className="mt-2 space-y-2">
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-black/50 p-2 text-[10px] leading-relaxed text-[#c2c6d6]">{prompt || "(no prompt captured)"}</pre>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8c909f]">Attachments</div>
              <ul className="mt-1 space-y-0.5">
                {attachments.length === 0 ? <li className="text-[10px] text-[#8c909f]">(none)</li> : attachments.map((a, i) => (
                  <li key={i} className="break-all text-[10px] text-[#c2c6d6]">{relativePath(a)}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
