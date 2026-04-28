"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import EmblemPicker from "./components/EmblemPicker";
import { pendantStyles, emblems, type PendantStyle } from "@/lib/assets";

type Step = 0 | 1 | 2 | 3 | 4;

const STEP_LABELS: readonly string[] = ["Name 1", "Name 2", "Name 3", "Name 5", "Name 6"];
const TYPICAL_SECONDS = 30;
const MAX_WAIT_SECONDS = 50;
type GoldComboKey = "YELLOW_WHITE" | "ROSE_WHITE" | "WHITE";

type GenerationOption = { id: string; label: string; src: string; variant?: number };

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

const MAX_NAME_LINES = 2; // limit for inputs on the first step
// helper to present styles in a swipeable two-row carousel
// Break styles into swipeable two-row columns for the style picker.
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
  const [step, setStep] = useState<Step>(0); // which screen of the flow the user is on
  const [lines, setLines] = useState<string[]>([""]); // name inputs are stored as an array for easy add/remove // name inputs are stored as an array for easy add/remove
  const [uppercaseApplied, setUppercaseApplied] = useState(false);
  const [styleId, setStyleId] = useState<string>(pendantStyles[0]?.id ?? "");
  const [includeEmblem, setIncludeEmblem] = useState(true);
  const [emblemId, setEmblemId] = useState<string | null>(null);
  const [goldCombo, setGoldCombo] = useState<GoldComboKey>("YELLOW_WHITE");
  const [diamondQuality, setDiamondQuality] = useState<"vs" | "vvs">("vvs");
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);
  const [generations, setGenerations] = useState<GenerationOption[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const pendantColumns = buildPendantColumns(pendantStyles); // update lib/assets.ts to add/remove styles
  const activeStyle = pendantStyles.find(style => style.id === styleId) ?? pendantStyles[0];

  const generationPlaceholders = useMemo<GenerationOption[]>(() => [
    { id: "draft-1", label: "Draft 1", src: "/samples/Gemini_Generated_Image_7tlquz7tlquz7tlq.png" },
    { id: "draft-2", label: "Draft 2", src: "/samples/Gemini_Generated_Image_a8vnkga8vnkga8vn.png" },
    { id: "draft-3", label: "Draft 3", src: "/samples/JWAE-Custom-Moissanite-Name-Pendant-14K-Gold-icecartel-white.png" },
    { id: "draft-4", label: "Draft 4", src: "/samples/King slanted.png" }
  ], []);

  const activeGenerations = useMemo<GenerationOption[]>(() => (generations.length ? generations : generationPlaceholders), [generations, generationPlaceholders]);


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

  const handleBack = () => {
    if (step === 0) {
      router.push("/");
      return;
    }
    setStep(prev => ((prev - 1) as Step));
  };

  const handleNext = () => {
    if (step === 0 && !hasPrimaryName) {
      return;
    }
    if (step > 1) {
      return;
    }
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
    if (trimmedLines.length === 0) return;

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
    setStep(3 as Step);

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error ?? 'Failed to generate pendant previews.');
      }

      const mapped: GenerationOption[] = Array.isArray(data?.results)
        ? data.results.map((entry: any) => ({
            id: `variant-${entry.variant}`,
            label: `Draft ${entry.variant}`,
            src: entry.imageUrl,
            variant: entry.variant
          }))
        : [];

      setGenerations(mapped);
      if (mapped.length) {
        setSelectedGenerationId(mapped[0].id);
        setStep(4 as Step);
      }
    } catch (error) {
      console.error(error);
      setGenerationError(error instanceof Error ? error.message : 'Something went wrong while generating.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinalizeSelection = () => {
    if (!selectedGenerationId) return;
    // Placeholder for future integration with checkout or contact flow.
    console.info("Selected generation", selectedGenerationId);
  };

  useEffect(() => {
    if (step !== 3 || !isGenerating) {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
      return;
    }

    setLoadingSeconds(0);
    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
    }
    loadingIntervalRef.current = setInterval(() => {
      setLoadingSeconds(prev => Math.min(prev + 1, MAX_WAIT_SECONDS));
    }, 1000);

    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
    };
  }, [step, isGenerating]);

  useEffect(() => {
    if (step !== 4) return;
    if (activeGenerations.length === 0) return;
    setSelectedGenerationId(prev => {
      if (prev && activeGenerations.some(item => item.id === prev)) return prev;
      return activeGenerations[0].id;
    });
  }, [step, activeGenerations]);

  const rawProgress = loadingSeconds <= TYPICAL_SECONDS
    ? loadingSeconds / TYPICAL_SECONDS
    : 0.66 + ((loadingSeconds - TYPICAL_SECONDS) / (MAX_WAIT_SECONDS - TYPICAL_SECONDS)) * 0.34;
  const loadingProgress = Math.min(rawProgress, 1);
  const loadingBarWidth = Math.max(loadingProgress, 0.05);

  return (
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
                      accept
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-1 flex-col justify-between space-y-14">
                <div className="rounded-3xl border border-[#71451F]/60 bg-black/40 px-6 py-6">
                  <h2 className="text-lg font-semibold">Drafting your imagination...</h2>
                  <p className="mt-2 text-sm text-white/60">We're sculpting shimmering concepts based on your direction.</p>
                  <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {activeGenerations.map(option => (
                      <div key={option.id} className="relative min-h-[220px] rounded-[32px] border border-white/12 bg-gradient-to-br from-white/5 via-white/10 to-white/5 sm:min-h-[260px]">
                        <div className="absolute inset-0 animate-pulse rounded-[30px] bg-gradient-to-br from-slate-800 via-slate-900 to-black" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black/60">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#2C48FF] to-[#0CB6DD] transition-[width] duration-500 ease-out"
                      style={{ width: `${Math.min(loadingBarWidth, 1) * 100}%` }}
                    />
                    <div className="relative flex h-11 items-center justify-center px-6 text-sm font-semibold uppercase tracking-[0.3em] text-[#FBD377]">
                      {loadingSeconds}s elapsed
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-white/60">Generations typically take about 30 seconds, but may take up to 50 seconds.</p>
                  {generationError && (
                    <div className="mt-4 rounded-2xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {generationError}
                    </div>
                  )}
                  {generationError && (
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => { setGenerationError(null); setStep(2 as Step); }}
                        className="flex-1 rounded-2xl border border-white/15 bg-black/45 px-5 py-3 text-sm font-medium transition hover:border-white/35"
                      >
                        back
                      </button>
                      <button
                        type="button"
                        onClick={handleAcceptDesign}
                        className={`flex-1 rounded-2xl px-5 py-3 text-sm font-semibold transition ${isGenerating ? 'cursor-wait border border-white/15 bg-black/45 text-white/50' : 'bg-blue-500 text-white hover:bg-blue-400'}`}
                      >
                        {isGenerating ? 'retrying...' : 'try again'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8">
                <div className="rounded-3xl border border-[#71451F]/60 bg-black/35 px-6 py-6">
                  <h2 className="text-lg font-semibold text-center sm:text-left">Choose your favourite</h2>
                  <p className="mt-2 text-sm text-white/60 text-center sm:text-left">Select the draft that matches your vision best. We'll refine the winner for production.</p>
                  <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {activeGenerations.map(option => {
                      const isSelected = selectedGenerationId === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSelectedGenerationId(option.id)}
                          className={`group relative overflow-hidden rounded-[32px] border ${isSelected ? "border-[3px] border-blue-400 shadow-[0_0_35px_rgba(59,130,246,0.45)]" : "border-white/15"} bg-black/35 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400`}
                          aria-pressed={isSelected}
                        >
                          <div className="relative aspect-[3/4] w-full sm:aspect-[4/5]">
                            <Image
                              src={option.src}
                              alt={option.label}
                              fill
                              sizes="(max-width: 768px) 360px, 520px"
                              className="object-cover transition duration-500 group-hover:scale-105"
                            />
                          </div>
                          <span className="pointer-events-none absolute inset-0 rounded-[32px] border border-white/12 bg-gradient-to-b from-transparent via-transparent to-black/50" aria-hidden />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setStep(2 as Step)}
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
              {STEP_LABELS.map((_, index) => (
                <span
                  key={index}
                  className={`h-2.5 w-2.5 rounded-full transition ${index === step ? "bg-blue-400" : "bg-white/25"}`}
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
  );
}

