"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import EmblemPicker from "./components/EmblemPicker";
import { pendantStyles, emblems, type PendantStyle } from "@/lib/assets";

type Step = 0 | 1 | 2 | 3 | 4;

const STEP_LABELS: readonly string[] = ["Style", "Emblem", "Review", "Creating", "Select"];
// Poll up to 50 times (× 2 s = 100 s) before giving up
const MAX_POLL_ATTEMPTS = 50;
type GoldComboKey = "YELLOW_WHITE" | "ROSE_WHITE" | "WHITE";

type GenerationOption = { id: string; label: string; src: string; variant: number };

const GOLD_COMBO_TO_METALS: Record<GoldComboKey, { twoTone: boolean; primary: 'rose_gold' | 'white_gold' | 'yellow_gold'; secondary: 'rose_gold' | 'white_gold' | 'yellow_gold' | null }> = {
  YELLOW_WHITE: { twoTone: true, primary: 'yellow_gold', secondary: 'white_gold' },
  ROSE_WHITE: { twoTone: true, primary: 'rose_gold', secondary: 'white_gold' },
  WHITE: { twoTone: false, primary: 'white_gold', secondary: null }
};

const GOLD_COMBOS: ReadonlyArray<{ id: GoldComboKey; label: string; summary: string }> = [
  { id: "YELLOW_WHITE", label: "Yellow + White Gold", summary: "Yellow gold + White gold" },
  { id: "ROSE_WHITE", label: "Rose + White Gold", summary: "Rose gold + White gold" },
  { id: "WHITE", label: "White Gold", summary: "White gold" }
];

const MAX_NAME_LINES = 2;

const buildPendantColumns = (styles: readonly PendantStyle[], perColumn = 2) =>
  styles.reduce<PendantStyle[][]>((columns, style, index) => {
    if (index % perColumn === 0) {
      columns.push([style]);
    } else {
      const last = columns.at(-1);
      if (last) last.push(style);
    }
    return columns;
  }, []);

export default function NameBuilder() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [lines, setLines] = useState<string[]>([""]);
  const [uppercaseApplied, setUppercaseApplied] = useState(false);
  const [styleId, setStyleId] = useState<string>(pendantStyles[0]?.id ?? "");
  const [includeEmblem, setIncludeEmblem] = useState(true);
  const [emblemId, setEmblemId] = useState<string | null>(null);
  const [goldCombo, setGoldCombo] = useState<GoldComboKey>("YELLOW_WHITE");
  const [diamondQuality, setDiamondQuality] = useState<"vs" | "vvs">("vvs");
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);
  const [generations, setGenerations] = useState<GenerationOption[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewOption, setPreviewOption] = useState<GenerationOption | null>(null);

  // Incremented on each new generation kick-off; stale poll callbacks check this
  // before applying state so a cancelled request can't jump the user to step 4.
  const generationEpochRef = useRef(0);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const pendantColumns = buildPendantColumns(pendantStyles);
  const activeStyle = pendantStyles.find(style => style.id === styleId) ?? pendantStyles[0];

  const selectedEmblem = emblemId ? emblems.find(asset => asset.id === emblemId) ?? null : null;
  const emblemSummary = includeEmblem ? (selectedEmblem ? selectedEmblem.label : "None selected") : "Not included";
  const activeGoldCombo = GOLD_COMBOS.find(option => option.id === goldCombo) ?? GOLD_COMBOS[0];
  const canAddLine = lines.length < MAX_NAME_LINES;
  const hasPrimaryName = lines[0]?.trim().length > 0;

  const updateLine = (value: string, index: number) => {
    setLines(prev => prev.map((entry, idx) => (idx === index ? value : entry)));
    setUppercaseApplied(false);
  };

  const addLine = () => {
    if (canAddLine) {
      setLines(prev => [...prev, ""]);
      setUppercaseApplied(false);
    }
  };

  const removeLine = (index: number) => {
    setLines(prev => prev.filter((_, idx) => idx !== index));
    setUppercaseApplied(false);
  };

  const uppercaseLines = () => {
    setLines(prev => prev.map(entry => entry.toUpperCase()));
    setUppercaseApplied(true);
  };

  const cancelPolling = () => {
    generationEpochRef.current += 1;
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setIsGenerating(false);
  };

  const confirmDiscardGenerations = () =>
    generations.length === 0 ||
    window.confirm("Going back will discard your generated drafts. Continue?");

  const handleBack = () => {
    if (step === 4 && !confirmDiscardGenerations()) return;
    if (step === 0) {
      router.push("/");
      return;
    }
    if (step === 4) {
      cancelPolling();
      setGenerations([]);
      setSelectedGenerationId(null);
    }
    const prevStep = step === 4 ? 2 : ((step - 1) as Step);
    setStep(prevStep as Step);
  };

  const handleNext = () => {
    if (step === 0 && !hasPrimaryName) return;
    if (step > 1) return;
    setStep(prev => ((prev + 1) as Step));
  };

  const isNextDisabled = step === 0 && !hasPrimaryName;
  const showFooterNext = step <= 1;

  const uppercaseButtonClass = uppercaseApplied
    ? "inline-flex items-center gap-2 rounded-2xl border border-[#C9943B] bg-[#C9943B]/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-black transition hover:border-[#F1B45A] hover:bg-[#F1B45A] hover:text-black"
    : "inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-black/45 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/40 hover:text-white";

  const handleAcceptDesign = async () => {
    if (isGenerating) return;
    const trimmedLines = lines.map(entry => entry.trim()).filter(Boolean);
    if (!trimmedLines.length) return;

    const metals = GOLD_COMBO_TO_METALS[goldCombo];
    const emblemValue = includeEmblem ? emblemId ?? 'none' : 'none';

    const payload = {
      userId: 'demo',
      styleId,
      text: trimmedLines.join('\n'),
      twoTone: metals.twoTone,
      primaryMetal: metals.primary,
      secondaryMetal: metals.twoTone ? metals.secondary : null,
      emblem: emblemValue
    };

    setGenerationError(null);
    setGenerations([]);
    setSelectedGenerationId(null);
    setIsGenerating(true);

    const epoch = ++generationEpochRef.current;

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? 'Failed to start generation.');
      if (epoch !== generationEpochRef.current) return;

      const requestId: string = data.requestId;
      // Move to results immediately — tiles appear as they're generated
      setStep(4 as Step);

      let pollCount = 0;
      const poll = async () => {
        if (epoch !== generationEpochRef.current) return;
        pollCount += 1;
        try {
          const pollRes = await fetch(`/api/requests/${requestId}`);
          const pollData = await pollRes.json().catch(() => ({}));
          if (epoch !== generationEpochRef.current) return;

          const results: Array<{ variant: number; imageUrl: string }> = pollData.results ?? [];
          const mapped: GenerationOption[] = results.map(r => ({
            id: `variant-${r.variant}`,
            label: `Draft ${r.variant}`,
            src: r.imageUrl,
            variant: r.variant
          }));
          setGenerations(mapped);
          if (mapped.length > 0) {
            setSelectedGenerationId(prev => prev ?? mapped[0].id);
          }

          if (pollData.done || pollCount >= MAX_POLL_ATTEMPTS) {
            pollTimeoutRef.current = null;
            setIsGenerating(false);
            return;
          }
        } catch {
          // silent — keep polling
        }
        pollTimeoutRef.current = setTimeout(poll, 2000);
      };

      // First poll fires immediately so the first image appears as soon as it's ready
      void poll();
    } catch (error) {
      if (epoch !== generationEpochRef.current) return;
      console.error(error);
      setGenerationError(error instanceof Error ? error.message : 'Something went wrong.');
      setIsGenerating(false);
    }
  };

  const handleFinalizeSelection = () => {
    if (!selectedGenerationId) return;
    // Placeholder for future checkout / contact flow.
    console.info("Selected generation", selectedGenerationId);
  };

  // Clean up any pending poll on unmount
  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, []);

  return (
    <>
    <main className="min-h-dvh px-4 py-10 text-white md:px-8">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col px-4 pb-12 pt-10 sm:px-6 md:px-12">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
          <button
            type="button"
            onClick={handleBack}
            className="mb-6 flex w-fit items-center gap-2 rounded-full border border-white/20 bg-black/35 px-4 py-2 text-sm uppercase tracking-wide transition hover:border-white/45"
          >
            back
          </button>

          <header>
            <p className="text-xs uppercase tracking-[0.35em] text-white/70">{STEP_LABELS[step]}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-[2.25rem]">Dream it first</h1>
            <p
              className="mt-1 text-2xl italic text-white/90"
              style={{ fontFamily: "var(--font-nostalgic)" }}
            >
              we&apos;ll build it.
            </p>
          </header>

          <section className="mt-8 flex-1">
            {step === 0 && (
              <div className="space-y-7">
                <div>
                  <label className="text-sm font-medium tracking-wide text-white/70">Text on Pendant</label>
                  <div className="mt-3 space-y-3">
                    {lines.map((value, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <input
                          value={value}
                          onChange={event => updateLine(event.target.value, index)}
                          placeholder={index === 0 ? "text on pendant..." : "add another line"}
                          className="flex-1 rounded-2xl border border-white/15 bg-black/45 px-4 py-3 text-base outline-none transition focus:border-white/40"
                        />
                        <div className="flex items-center gap-2">
                          {lines.length > 1 && index > 0 && (
                            <button
                              type="button"
                              onClick={() => removeLine(index)}
                              className="h-11 w-11 rounded-2xl border border-white/15 bg-black/60 text-2xl font-semibold leading-none text-white/80 transition hover:border-white/40"
                              aria-label="Remove name line"
                            >
                              -
                            </button>
                          )}
                          {index === lines.length - 1 && canAddLine && (
                            <button
                              type="button"
                              onClick={addLine}
                              className="h-11 w-11 rounded-2xl border border-white/15 bg-black/60 text-2xl font-semibold leading-none text-white/80 transition hover:border-white/40"
                              aria-label="Add another line"
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
                      aria-label="Convert all text to uppercase"
                      aria-pressed={uppercaseApplied}
                      className={uppercaseButtonClass}
                    >
                      All Uppercase
                    </button>
                  </div>
                </div>

                <div>
                  {/* Style selector cards; add art or adjust layout here. */}
                  <h2 className="text-lg font-semibold">Choose Style</h2>
                  <p className="mt-1 text-sm text-white/60">Swipe through to explore different pendant looks.</p>
                  <div className="mt-4 -mx-0.5 overflow-x-auto pb-2">
                    <div className="flex snap-x snap-mandatory gap-1.5 px-0">
                      {pendantColumns.map((column, columnIndex) => (
                        <div key={columnIndex} className="grid min-w-[192px] grid-rows-2 gap-3 snap-start">
                          {column.map(style => {
                            const isActive = style.id === styleId;
                            const stateClass = isActive
                              ? "border-[4px] border-[#C5934F] shadow-[0_18px_36px_rgba(113,69,31,0.45)] hover:border-[#E3A86A]"
                              : "border border-[#71451F] hover:border-[#986035]";
                            return (
                              <button
                                key={style.id}
                                onClick={() => setStyleId(style.id)}
                                type="button"
                                className={`group relative h-[184px] w-[184px] overflow-hidden rounded-[30px] bg-black/40 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${stateClass}`}
                                aria-pressed={isActive}
                              >
                                <Image
                                  src={style.src}
                                  alt={`${style.label} pendant style`}
                                  fill
                                  sizes="(max-width: 640px) 210px, 260px"
                                  className="object-cover object-center transition duration-500 group-hover:scale-105"
                                />
                                <span className="pointer-events-none absolute inset-0 rounded-[30px] border border-[#71451F]/60 bg-gradient-to-b from-transparent via-transparent to-black/35" aria-hidden />
                              </button>
                            );
                          })}
                          {column.length === 1 && (
                            <div className="h-[184px] w-[184px] rounded-[30px] border border-transparent" aria-hidden />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-8">
                {/* Emblem step: toggle, picker, gold tones. */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Emblem</h2>
                    <p className="text-sm text-white/60">Add a symbol on top of the pendant where the chain loops through.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIncludeEmblem(value => !value)}
                    className={`relative h-7 w-12 rounded-full border border-white/15 transition ${includeEmblem ? "bg-blue-500/80" : "bg-black/50"}`}
                    aria-pressed={includeEmblem}
                    aria-label="Toggle emblem"
                  >
                    <span
                      className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white transition ${includeEmblem ? "left-6" : "left-1"}`}
                    />
                  </button>
                </div>

                <EmblemPicker
                  selected={includeEmblem ? emblemId : null}
                  onSelect={setEmblemId}
                  disabled={!includeEmblem}
                />

                <div>
                  <h2 className="text-lg font-semibold text-center">Gold Finish</h2>
                  <p className="mt-1 text-sm text-white/60 text-center">Hand-picked combinations that balance warmth and contrast.</p>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {GOLD_COMBOS.map(option => {
                      const isActive = goldCombo === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setGoldCombo(option.id)}
                          aria-pressed={isActive}
                          className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${isActive ? "border-[3px] border-blue-400 bg-blue-500/20 text-white" : "border-[#71451F] bg-black/45 text-white/80 hover:border-[#986035]"}`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8">
                {/* Final confirmation screen details. */}
                <div>
                  <h2 className="text-lg font-semibold">Diamond Quality</h2>
                  <div className="mt-4 flex gap-3">
                    {(["vs", "vvs"] as const).map(option => {
                      const isActive = diamondQuality === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setDiamondQuality(option)}
                          aria-pressed={isActive}
                          className={`min-w-[72px] rounded-2xl border border-white/15 px-4 py-2 text-lg uppercase transition hover:border-white/35 ${isActive ? "border-[3px] border-blue-400 bg-blue-500/15" : "bg-black/45"}`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm uppercase tracking-[0.35em] text-white/60">Drafting your imagination...</h3>
                  <div className="mt-4 rounded-3xl border border-[#71451F]/60 bg-black/50 p-4">
                    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-black/70">
                      {activeStyle && (
                        <Image
                          src={activeStyle.src}
                          alt={`${activeStyle.label} preview`}
                          fill
                          sizes="(max-width: 640px) 220px, 360px"
                          className="object-cover"
                          priority={false}
                        />
                      )}
                    </div>
                    <dl className="mt-4 space-y-2 text-sm text-white/60">
                      <div className="flex justify-between">
                        <dt>Name</dt>
                        <dd className="font-medium text-white/90">{lines.filter(Boolean).join(" ") || "Your idea"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Style</dt>
                        <dd className="font-medium text-white/90">{activeStyle?.label}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Gold</dt>
                        <dd className="font-medium text-white/90">{activeGoldCombo.summary}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Emblem</dt>
                        <dd className="font-medium text-white/90">{emblemSummary}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Diamond</dt>
                        <dd className="font-medium text-white/90">{diamondQuality.toUpperCase()}</dd>
                      </div>
                    </dl>
                  </div>
                  {generationError && (
                    <div className="mt-4 rounded-2xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {generationError}
                    </div>
                  )}
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setStep(0)}
                      className="flex-1 rounded-2xl border border-white/15 bg-black/45 px-5 py-3 text-base font-medium transition hover:border-white/35"
                    >
                      edit
                    </button>
                    <button
                      type="button"
                      onClick={handleAcceptDesign}
                      disabled={isGenerating}
                      className={`flex-1 rounded-2xl px-5 py-3 text-base font-semibold transition ${isGenerating ? 'cursor-wait border border-white/15 bg-black/45 text-white/50' : 'bg-blue-500 text-white hover:bg-blue-400'}`}
                    >
                      {isGenerating ? 'submitting...' : 'accept'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8">
                <div className="rounded-3xl border border-[#71451F]/60 bg-black/35 px-6 py-6">
                  <h2 className="text-lg font-semibold text-center sm:text-left">
                    {isGenerating ? "Drafting your designs…" : "Choose your favourite"}
                  </h2>
                  <p className="mt-2 text-sm text-white/60 text-center sm:text-left">
                    {isGenerating
                      ? "Designs appear as they're generated — pick your favourite when ready."
                      : "Select the draft that matches your vision best. We'll refine the winner for production."}
                  </p>
                  {isGenerating && (
                    <p className="mt-1 text-xs text-white/35 text-center sm:text-left">
                      {generations.length} of 4 generated
                    </p>
                  )}
                  <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {([1, 2, 3, 4] as const).map(variantNum => {
                      const option = generations.find(g => g.variant === variantNum);
                      if (!option) {
                        return (
                          <div
                            key={variantNum}
                            className="relative min-h-[220px] rounded-[32px] border border-white/12 bg-gradient-to-br from-white/5 via-white/10 to-white/5 sm:min-h-[260px]"
                          >
                            <div className="absolute inset-0 animate-pulse rounded-[30px] bg-gradient-to-br from-slate-800 via-slate-900 to-black" />
                            <div className="absolute inset-0 flex items-end justify-center pb-4">
                              <span className="text-xs uppercase tracking-widest text-white/25">Draft {variantNum}</span>
                            </div>
                          </div>
                        );
                      }
                      const isSelected = selectedGenerationId === option.id;
                      return (
                        <div key={option.id} className="relative">
                          <button
                            type="button"
                            onClick={() => setSelectedGenerationId(option.id)}
                            className={`group relative block w-full overflow-hidden rounded-[32px] border ${isSelected ? "border-[3px] border-blue-400 shadow-[0_0_35px_rgba(59,130,246,0.45)]" : "border-white/15"} bg-black/35 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400`}
                            aria-pressed={isSelected}
                            aria-label={option.label}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={option.src}
                              alt={option.label}
                              className="block h-auto w-full transition duration-500 group-hover:scale-105"
                            />
                            <span className="pointer-events-none absolute inset-0 rounded-[32px] border border-white/12 bg-gradient-to-b from-transparent via-transparent to-black/50" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewOption(option)}
                            className="absolute right-3 top-3 z-10 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm transition hover:bg-black/85"
                            aria-label={`Preview ${option.label}`}
                          >
                            view
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => { if (!confirmDiscardGenerations()) return; cancelPolling(); setGenerations([]); setSelectedGenerationId(null); setStep(2 as Step); }}
                    className="flex-1 rounded-2xl border border-white/15 bg-black/45 px-5 py-3 text-base font-medium transition hover:border-white/35"
                  >
                    back
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalizeSelection}
                    disabled={!selectedGenerationId}
                    className={`flex-1 rounded-2xl px-5 py-3 text-base font-semibold transition ${selectedGenerationId ? "bg-blue-500 text-white hover:bg-blue-400" : "cursor-not-allowed border border-white/15 bg-black/45 text-white/50"}`}
                  >
                    continue
                  </button>
                </div>
              </div>
            )}

          </section>

          <footer className="mt-12 flex items-center justify-between">
            <span className="w-16" aria-hidden />

            <div className="flex items-center justify-center gap-2">
              {/* Show 4 dots for the 4 visible steps (0,1,2,4) — step 3 is transient */}
              {([0, 1, 2, 4] as const).map(idx => (
                <span
                  key={idx}
                  className={`h-2.5 w-2.5 rounded-full transition ${idx === step ? "bg-blue-400" : "bg-white/25"}`}
                />
              ))}
            </div>

            {showFooterNext ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={isNextDisabled}
                aria-disabled={isNextDisabled}
                className={`rounded-full border px-4 py-2 text-sm uppercase tracking-wide transition ${isNextDisabled ? "cursor-not-allowed border-white/20 bg-white/5 text-white/40" : "border-blue-500 bg-blue-500/20 text-blue-100 hover:bg-blue-500/30"}`}
              >
                next
              </button>
            ) : (
              <span className="w-16" aria-hidden />
            )}
          </footer>

        </div>
      </div>
    </main>

    {previewOption && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${previewOption.label} preview`}
        onClick={() => setPreviewOption(null)}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      >
        <div
          onClick={e => e.stopPropagation()}
          className="relative flex max-h-[92vh] max-w-6xl flex-col items-center gap-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewOption.src}
            alt={previewOption.label}
            className="block max-h-[80vh] max-w-full rounded-2xl object-contain"
          />
          <div className="flex items-center gap-3">
            <a
              href={previewOption.src}
              download={`${previewOption.label.replace(/\s+/g, "-").toLowerCase()}.png`}
              className="rounded-full bg-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-400"
            >
              Download
            </a>
            <button
              type="button"
              onClick={() => setPreviewOption(null)}
              className="rounded-full border border-white/30 bg-black/50 px-5 py-2 text-sm font-semibold text-white transition hover:border-white/60"
            >
              Close
            </button>
          </div>
          <button
            type="button"
            onClick={() => setPreviewOption(null)}
            aria-label="Close preview"
            className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl font-bold leading-none text-black shadow-lg hover:bg-white/90"
          >
            ×
          </button>
        </div>
      </div>
    )}
    </>
  );
}
