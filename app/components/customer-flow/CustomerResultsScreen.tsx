"use client";

import { cx, themeBorder, themeFocusRing, themeRadius, themeSurface } from "@/src/lib/theme/ui-classes";

export type CustomerDesignResult = {
  id: string;
  label: string;
  src?: string | null;
  status?: "pending" | "succeeded" | "failed";
  badgeLabel?: string;
};

type CustomerResultsScreenProps = {
  results: CustomerDesignResult[];
  expectedCount?: number;
  selectedResultId: string | null;
  title?: string;
  generatingTitle?: string;
  subtitle?: string;
  generatingSubtitle?: string;
  isGenerating?: boolean;
  generationCountLabel?: string;
  errors?: Array<string | null | undefined>;
  emptyLabelPrefix?: string;
  selectionHint?: string;
  usageLabel?: string;
  successMessage?: string | null;
  downloadLabel?: string;
  onSelect: (id: string) => void;
  onPreview?: (result: CustomerDesignResult) => void;
  onEdit?: (result: CustomerDesignResult) => void;
  canEdit?: boolean;
};

const EMPTY_ERRORS: Array<string | null | undefined> = [];

export function CustomerResultPreviewDialog({
  result,
  onClose
}: {
  result: CustomerDesignResult;
  onClose: () => void;
}) {
  if (!result.src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${result.label} preview`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
    >
      <div
        onClick={event => event.stopPropagation()}
        className="relative flex max-h-[92vh] max-w-6xl flex-col items-center gap-4"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.src}
          alt={result.label}
          className="block max-h-[80vh] max-w-full rounded-2xl object-contain"
        />
        <div className="flex items-center gap-3">
          <a
            href={result.src}
            download={`${result.label.replace(/\s+/g, "-").toLowerCase()}.png`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-400"
          >
            Download
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/30 bg-black/50 px-5 py-2 text-sm font-semibold text-white transition hover:border-white/60"
          >
            Close
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl font-bold leading-none text-black shadow-lg hover:bg-white/90"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function CustomerResultsScreen({
  results,
  expectedCount = results.length,
  selectedResultId,
  title = "Choose your favourite",
  generatingTitle = "Drafting your designs...",
  subtitle = "Select the draft that matches your vision best. We'll refine the winner for production.",
  generatingSubtitle = "Designs appear as they're generated — pick your favourite when ready.",
  isGenerating = false,
  generationCountLabel,
  errors = EMPTY_ERRORS,
  emptyLabelPrefix = "Draft",
  selectionHint = "Select an image to preview or download",
  usageLabel,
  successMessage,
  downloadLabel = "Download",
  onSelect,
  onPreview,
  onEdit,
  canEdit = false
}: CustomerResultsScreenProps) {
  const selectedResult = results.find(result => result.id === selectedResultId) ?? null;
  const visibleErrors = errors.filter((error): error is string => Boolean(error));
  const placeholderCount = Math.max(0, expectedCount - results.length);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface-muted)] px-6 py-6">
        <h2 className="text-center text-lg font-semibold sm:text-left">
          {isGenerating ? generatingTitle : title}
        </h2>
        <p className="mt-2 text-center text-sm text-[var(--theme-text-soft)] sm:text-left">
          {isGenerating ? generatingSubtitle : subtitle}
        </p>
        {generationCountLabel ? (
          <p className="mt-1 text-center text-xs text-[var(--theme-text-muted)] sm:text-left">
            {generationCountLabel}
          </p>
        ) : null}
        {visibleErrors.map(error => (
          <div key={error} className="mt-4 rounded-2xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ))}

        <div className={cx("mt-6 grid grid-cols-1 gap-6", expectedCount > 1 ? "sm:grid-cols-2" : "mx-auto max-w-md")}>
          {results.map(result => {
            const isSelected = selectedResultId === result.id;
            const isPending = result.status === "pending";
            const isFailed = result.status === "failed";
            return (
              <div key={result.id} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (!isPending && !isFailed) onSelect(result.id);
                  }}
                  disabled={isPending || isFailed}
                  className={cx(
                    "group relative block min-h-[220px] w-full overflow-hidden transition sm:min-h-[260px]",
                    themeRadius.resultCard,
                    themeSurface.muted,
                    themeFocusRing,
                    isSelected
                      ? cx(themeBorder.selected, "shadow-[0_0_35px_var(--theme-selected-glow)]")
                      : themeBorder.base,
                    isPending || isFailed ? "cursor-not-allowed" : ""
                  )}
                  aria-pressed={isSelected}
                  aria-label={result.label}
                >
                  {result.src && !isFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={result.src}
                      alt={result.label}
                      className="block h-auto w-full transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-800 via-slate-900 to-black" />
                  )}
                  {result.badgeLabel ? (
                    <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                      {result.badgeLabel}
                    </span>
                  ) : null}
                  <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-transparent via-transparent to-black/20" aria-hidden />
                  {(isPending || isFailed) ? (
                    <span className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-semibold text-white/70">
                      {isPending ? "Creating revision..." : "Revision failed"}
                    </span>
                  ) : null}
                </button>
                {canEdit && !isPending && !isFailed && onEdit ? (
                  <button
                    type="button"
                    onClick={() => onEdit(result)}
                    className={`absolute left-3 z-10 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm transition hover:bg-black/85 ${result.badgeLabel ? "top-12" : "top-3"}`}
                    aria-label={`Edit ${result.label}`}
                  >
                    edit
                  </button>
                ) : null}
                {!isPending && !isFailed && result.src && onPreview ? (
                  <button
                    type="button"
                    onClick={() => onPreview(result)}
                    className="absolute right-3 top-3 z-10 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm transition hover:bg-black/85"
                    aria-label={`Preview ${result.label}`}
                  >
                    view
                  </button>
                ) : null}
              </div>
            );
          })}
          {Array.from({ length: placeholderCount }).map((_, index) => {
            const draftNumber = results.length + index + 1;
            return (
              <div
                key={`placeholder-${draftNumber}`}
                className={cx(
                  "relative min-h-[220px] overflow-hidden border border-white/12 bg-gradient-to-br from-white/5 via-white/10 to-white/5 sm:min-h-[260px]",
                  themeRadius.resultCard
                )}
              >
                <div className={cx("absolute inset-0 animate-pulse bg-gradient-to-br from-slate-800 via-slate-900 to-black", themeRadius.imageOption)} />
                <div className="absolute inset-0 flex items-end justify-center pb-4">
                  <span className="text-xs uppercase tracking-widest text-white/25">{emptyLabelPrefix} {draftNumber}</span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-[var(--theme-text-muted)]">
          {selectedResult ? `${selectedResult.label} selected` : selectionHint}
          {usageLabel ? (
            <>
              <span className="mx-2 text-[var(--theme-text-muted)]/50">•</span>
              {usageLabel}
            </>
          ) : null}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            if (selectedResult?.src) window.open(selectedResult.src, "_blank", "noopener,noreferrer");
          }}
          disabled={!selectedResult?.src}
          className={`flex-1 rounded-2xl px-5 py-3 text-base font-semibold transition ${
            selectedResult?.src
              ? "border border-[color:var(--theme-border)] bg-black/25 text-[var(--theme-text)] hover:border-[color:var(--theme-border-hover)]"
              : "cursor-not-allowed border border-white/15 bg-black/45 text-white/50"
          }`}
        >
          {downloadLabel}
        </button>
      </div>

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-400/50 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-50">
          {successMessage}
        </div>
      ) : null}
    </div>
  );
}
