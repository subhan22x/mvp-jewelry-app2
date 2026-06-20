"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import DesignProgressBar from "@/app/components/DesignProgressBar";
import ThemedImageOption from "@/app/components/ThemedImageOption";
import ThemedOptionButton from "@/app/components/ThemedOptionButton";
import { cx, panelClass, themeBorder, themeRadius, themeSurface } from "@/src/lib/theme/ui-classes";

type BraceletStyleKey = "style_1" | "style_2" | "style_3" | "style_4";
type ColorKey = "rose_gold" | "yellow_gold" | "white";
type StoneKey = "natural_diamonds" | "lab_diamonds" | "moissanite" | "cz";
type DiamondQualityKey = "vs" | "vvs";
type MetalKey = "gold" | "silver";

type BraceletStyle = {
  id: BraceletStyleKey;
  label: string;
  src: string;
};

const BRACELET_STYLES: BraceletStyle[] = [
  { id: "style_1", label: "Bracelet style 1", src: "/bracelets/styles/icedout-bracelet-1.png" },
  { id: "style_2", label: "Bracelet style 2", src: "/bracelets/styles/icedout-bracelet-2.png" },
  { id: "style_3", label: "Bracelet style 3", src: "/bracelets/styles/icedout-bracelet-3.png" },
  { id: "style_4", label: "Bracelet style 4", src: "/bracelets/styles/icedout-bracelet-4.png" }
];

const COLOR_COMBOS: Array<{ id: ColorKey; label: string; swatch: string }> = [
  { id: "rose_gold", label: "Rose Gold", swatch: "from-[#e8a182] via-[#d48669] to-[#f3d7c9]" },
  { id: "yellow_gold", label: "Yellow Gold", swatch: "from-[#f9d978] via-[#e7ad32] to-[#fff0a8]" },
  { id: "white", label: "White", swatch: "from-[#ffffff] via-[#dce5ef] to-[#aab6c5]" }
];

const STONE_TYPES: Array<{ id: StoneKey; label: string }> = [
  { id: "natural_diamonds", label: "Natural Diamonds" },
  { id: "lab_diamonds", label: "Lab" },
  { id: "moissanite", label: "Moissanite" },
  { id: "cz", label: "CZ" }
];

const DIAMOND_QUALITIES: Array<{ id: DiamondQualityKey; label: string }> = [
  { id: "vs", label: "VS" },
  { id: "vvs", label: "VVS" }
];

const METAL_TYPES: Array<{ id: MetalKey; label: string }> = [
  { id: "gold", label: "Gold" },
  { id: "silver", label: "Silver" }
];

const MAX_LINES = 2;
const MAX_CHARS_PER_LINE = 8;

function sanitizeLine(value: string) {
  return value.replace(/\s+/g, " ").slice(0, MAX_CHARS_PER_LINE);
}

function buildColumns(styles: readonly BraceletStyle[], perColumn = 2) {
  return styles.reduce<BraceletStyle[][]>((columns, style, index) => {
    if (index % perColumn === 0) {
      columns.push([style]);
    } else {
      const last = columns.at(-1);
      if (last) last.push(style);
    }
    return columns;
  }, []);
}

export default function IcedoutBraceletBuilder({
  backHref = "/bracelets",
  accountSlug
}: {
  backHref?: string;
  accountSlug?: string;
}) {
  const [lines, setLines] = useState([""]);
  const [uppercaseApplied, setUppercaseApplied] = useState(false);
  const [styleId, setStyleId] = useState<BraceletStyleKey>("style_1");
  const [color, setColor] = useState<ColorKey>("rose_gold");
  const [stoneType, setStoneType] = useState<StoneKey>("natural_diamonds");
  const [diamondQuality, setDiamondQuality] = useState<DiamondQualityKey>("vvs");
  const [metalType, setMetalType] = useState<MetalKey>("gold");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<"idle" | "pending" | "succeeded" | "failed">("idle");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);

  const columns = useMemo(() => buildColumns(BRACELET_STYLES), []);
  const selectedStyle = BRACELET_STYLES.find(style => style.id === styleId) ?? BRACELET_STYLES[0];
  const normalizedLines = lines.map(line => line.trim()).filter(Boolean);
  const canAddLine = lines.length < MAX_LINES;
  const canGenerate = normalizedLines.length > 0;

  function updateLine(index: number, value: string) {
    const nextValue = sanitizeLine(value);
    setUppercaseApplied(false);
    setLines(current => current.map((line, lineIndex) => lineIndex === index ? nextValue : line));
  }

  function addLine() {
    if (!canAddLine) return;
    setLines(current => [...current, ""]);
  }

  function removeLine(index: number) {
    setLines(current => current.filter((_, lineIndex) => lineIndex !== index));
  }

  function uppercaseLines() {
    setLines(current => current.map(line => line.toUpperCase()));
    setUppercaseApplied(true);
  }

  async function pollGeneration(nextRequestId: string, signal: AbortSignal) {
    for (let attempt = 0; attempt < 60; attempt++) {
      if (signal.aborted) return;
      const response = await fetch(`/api/requests/${nextRequestId}`, { cache: "no-store", signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Unable to check bracelet generation.");
      const succeeded = data.results?.[0]?.imageUrl;
      if (succeeded) {
        setGeneratedImageUrl(succeeded);
        setGenerationStatus("succeeded");
        return;
      }
      const failedAttempt = data.attempts?.find((item: { status?: string }) => item.status === "failed");
      if (data.done && failedAttempt) {
        throw new Error(failedAttempt.error ?? "Bracelet generation failed.");
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error("Bracelet generation is taking longer than expected. Check back shortly.");
  }

  async function generateBracelet() {
    if (!canGenerate || generationStatus === "pending") return;
    pollAbortRef.current?.abort();
    const controller = new AbortController();
    pollAbortRef.current = controller;
    setGenerationStatus("pending");
    setGenerationError(null);
    setGeneratedImageUrl(null);

    try {
      const response = await fetch("/api/bracelet-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "demo",
          accountSlug,
          text: normalizedLines.join("\n"),
          styleId,
          colorCombo: color,
          stoneType,
          diamondQuality,
          metalType
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Unable to start bracelet generation.");
      setRequestId(data.requestId);
      await pollGeneration(data.requestId, controller.signal);
    } catch (error) {
      if (controller.signal.aborted) return;
      setGenerationStatus("failed");
      setGenerationError(error instanceof Error ? error.message : "Bracelet generation failed.");
    }
  }

  return (
    <main className="min-h-dvh overflow-x-hidden px-4 py-4 text-[var(--theme-text)] md:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-5xl min-w-0 flex-col px-1 pb-6 pt-3 sm:px-4 md:px-10 md:pt-6">
        <div className="mb-7 grid min-h-10 grid-cols-[2.5rem_1fr_2.5rem] items-center gap-3">
          <Link
            href={backHref}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--theme-border)] bg-[var(--theme-surface)] text-xl leading-none text-[var(--theme-text)] transition hover:border-[color:var(--theme-border-hover)]"
          >
            ←
          </Link>
          <DesignProgressBar current={1} className="justify-self-center" />
          <span aria-hidden="true" />
        </div>

        <header className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--theme-text-soft)]">Icedout Bracelets</p>
          <h1 className="mt-2 text-[2.15rem] font-semibold tracking-tight text-[var(--theme-heading)] md:text-[2.5rem]">Dream it first</h1>
          <p
            className="mt-1 text-[1.55rem] italic leading-none text-[var(--theme-script)] md:text-3xl"
            style={{ fontFamily: "var(--font-nostalgic)" }}
          >
            we&apos;ll build it.
          </p>
        </header>

        <section className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-8">
            <section className="min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">Text on Bracelet</h2>
                  <p className="mt-1 text-sm text-[var(--theme-text-soft)]">Up to 2 lines, 8 letters per line.</p>
                </div>
                <span className="shrink-0 rounded-full border border-[color:var(--theme-border)] px-3 py-1 text-xs font-semibold text-[var(--theme-text-soft)]">
                  {normalizedLines.join("").length}/16
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {lines.map((line, index) => (
                  <div key={index} className="min-w-0">
                    <label className="text-sm text-[var(--theme-text-soft)]">Line {index + 1}</label>
                    <div className="mt-2 flex min-w-0 items-center gap-2">
                      <input
                        value={line}
                        onChange={event => updateLine(index, event.target.value)}
                        maxLength={MAX_CHARS_PER_LINE}
                        placeholder={index === 0 ? "text..." : "optional..."}
                        className={cx(
                          "h-14 min-w-0 flex-1 rounded-2xl px-4 text-base outline-none transition placeholder:text-[var(--theme-text-muted)] focus:border-[color:var(--theme-selected-border)]",
                          themeBorder.base,
                          themeSurface.base
                        )}
                      />
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="h-11 w-11 shrink-0 rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] text-2xl font-semibold leading-none text-[var(--theme-text-soft)] transition hover:border-[color:var(--theme-border-hover)]"
                          aria-label="Remove bracelet text line"
                        >
                          -
                        </button>
                      )}
                      {index === lines.length - 1 && canAddLine && (
                        <button
                          type="button"
                          onClick={addLine}
                          className="h-11 w-11 shrink-0 rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] text-2xl font-semibold leading-none text-[var(--theme-text-soft)] transition hover:border-[color:var(--theme-border-hover)]"
                          aria-label="Add another bracelet text line"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={uppercaseLines}
                  aria-pressed={uppercaseApplied}
                  className="inline-flex max-w-full items-center justify-center rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--theme-text-soft)] transition hover:border-[color:var(--theme-border-hover)] hover:text-[var(--theme-text)]"
                >
                  All Uppercase
                </button>
              </div>
            </section>

            <section className="min-w-0">
              <h2 className="text-lg font-semibold">Choose Style</h2>
              <p className="mt-1 text-sm text-[var(--theme-text-soft)]">Swipe through to explore icedout bracelet looks.</p>
              <div className="mt-4 -mx-4 overflow-x-auto px-4 pb-5 pt-1">
                <div className="flex snap-x snap-mandatory gap-4">
                  {columns.map((column, columnIndex) => (
                    <div key={columnIndex} className="grid min-w-[192px] grid-rows-2 gap-3 snap-start">
                      {column.map(style => (
                        <ThemedImageOption
                          key={style.id}
                          onClick={() => setStyleId(style.id)}
                          selected={styleId === style.id}
                          src={style.src}
                          label={style.label}
                          imageClassName="object-contain object-center p-4 transition duration-500 group-hover:scale-105"
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-7">
              <div>
                <h2 className="text-lg font-semibold">Color Combo</h2>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {COLOR_COMBOS.map(option => (
                    <ThemedOptionButton key={option.id} selected={color === option.id} onClick={() => setColor(option.id)} className="min-h-14">
                      <span className="flex items-center justify-center gap-3">
                        <span className={cx("h-7 w-7 rounded-full border border-white/45 bg-gradient-to-br", option.swatch)} aria-hidden />
                        <span>{option.label}</span>
                      </span>
                    </ThemedOptionButton>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold">Stone Type</h2>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
                  {STONE_TYPES.map(option => (
                    <ThemedOptionButton key={option.id} selected={stoneType === option.id} onClick={() => setStoneType(option.id)}>
                      {option.label}
                    </ThemedOptionButton>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold">Diamond Quality</h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  {DIAMOND_QUALITIES.map(option => (
                    <ThemedOptionButton key={option.id} selected={diamondQuality === option.id} onClick={() => setDiamondQuality(option.id)} size="sm" minWidthClass="min-w-[84px]">
                      {option.label}
                    </ThemedOptionButton>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold">Metal Type</h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  {METAL_TYPES.map(option => (
                    <ThemedOptionButton key={option.id} selected={metalType === option.id} onClick={() => setMetalType(option.id)} size="sm" minWidthClass="min-w-[92px]">
                      {option.label}
                    </ThemedOptionButton>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <aside className={panelClass("h-fit min-w-0 p-4")}>
            <div className={cx("relative aspect-square overflow-hidden", themeRadius.imageOption, themeSurface.muted)}>
              <img src={selectedStyle.src} alt={selectedStyle.label} className="h-full w-full object-contain p-5" />
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--theme-text-soft)]">Text</dt>
                <dd className="text-right font-semibold">{normalizedLines.join(" / ") || "Not set"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--theme-text-soft)]">Style</dt>
                <dd className="text-right font-semibold">{selectedStyle.label.replace("Bracelet ", "")}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--theme-text-soft)]">Color</dt>
                <dd className="text-right font-semibold">{COLOR_COMBOS.find(option => option.id === color)?.label}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--theme-text-soft)]">Stone</dt>
                <dd className="text-right font-semibold">{STONE_TYPES.find(option => option.id === stoneType)?.label}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--theme-text-soft)]">Quality</dt>
                <dd className="text-right font-semibold">{diamondQuality.toUpperCase()}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--theme-text-soft)]">Metal</dt>
                <dd className="text-right font-semibold">{METAL_TYPES.find(option => option.id === metalType)?.label}</dd>
              </div>
            </dl>
            <button
              type="button"
              disabled={!canGenerate || generationStatus === "pending"}
              onClick={() => void generateBracelet()}
              className="mt-5 w-full rounded-2xl bg-[var(--theme-accent)] px-4 py-3 text-sm font-semibold text-[var(--theme-accent-contrast)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {generationStatus === "pending" ? "Generating..." : "Generate Bracelet"}
            </button>
            {!canGenerate && <p className="mt-3 text-center text-xs text-[var(--theme-text-soft)]">Add bracelet text to continue.</p>}
            {requestId && <p className="mt-3 text-center text-xs text-[var(--theme-text-soft)]">Request {requestId.slice(0, 8)}</p>}
            {generationError && <p className="mt-3 rounded-2xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">{generationError}</p>}
            {generationStatus === "pending" && (
              <p className="mt-3 text-center text-sm text-[var(--theme-text-soft)]">Creating the bracelet preview with the selected style reference.</p>
            )}
            {generatedImageUrl && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold">Generated Preview</p>
                <div className={cx("relative aspect-square overflow-hidden", themeRadius.imageOption, themeSurface.muted)}>
                  <img src={generatedImageUrl} alt="Generated icedout bracelet" className="h-full w-full object-contain object-center" />
                </div>
                <a
                  href={generatedImageUrl}
                  download="icedout-bracelet.png"
                  className="mt-3 block rounded-2xl border-2 border-[color:var(--theme-border)] px-4 py-3 text-center text-sm font-semibold text-[var(--theme-text)] transition hover:border-[color:var(--theme-border-hover)]"
                >
                  Download Image
                </a>
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
