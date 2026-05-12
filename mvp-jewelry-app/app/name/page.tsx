"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ThemedImageOption from "../components/ThemedImageOption";
import EmblemPicker from "./components/EmblemPicker";
import LeadCaptureModal from "./components/LeadCaptureModal";
import { pendantStyles, emblems, type PendantStyle } from "@/lib/assets";

type Step = 0 | 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: readonly string[] = ["Style", "Emblem", "Review", "Creating", "Select", "Video"];
// Poll up to 50 times (× 2 s = 100 s) before giving up
const MAX_POLL_ATTEMPTS = 50;
const MAX_VIDEO_POLL_ATTEMPTS = 80;
type GoldComboKey = "YELLOW_WHITE" | "ROSE_WHITE" | "WHITE";
type PendantSizeKey = "2_3_inches" | "3_4_5_inches" | "4_5_7_inches" | "7_10_inches";
type MetalTypeKey = "gold" | "silver";
type StoneTypeKey = "natural_diamonds" | "lab_diamonds" | "moissanite";

type GenerationOption = { id: string; label: string; src: string; variant: number };
type GenerationAttempt = {
  variant: number;
  status: "pending" | "succeeded" | "failed";
  error?: string | null;
  durationSeconds?: number | null;
};
type VideoStatus = {
  id: string;
  status: "pending" | "succeeded" | "failed";
  videoUrl?: string | null;
  error?: string | null;
  durationSeconds?: number | null;
};
type LeadContact = { leadId: string; name: string; phone: string; email: string };

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

const PENDANT_SIZES: ReadonlyArray<{ id: PendantSizeKey; label: string }> = [
  { id: "2_3_inches", label: "2 - 3 inches" },
  { id: "3_4_5_inches", label: "3 - 4.5 inches" },
  { id: "4_5_7_inches", label: "4.5 - 7 inches" },
  { id: "7_10_inches", label: "7 - 10 inches" }
];

const METAL_TYPES: ReadonlyArray<{ id: MetalTypeKey; label: string }> = [
  { id: "gold", label: "Gold" },
  { id: "silver", label: "Silver" }
];

const STONE_TYPES: ReadonlyArray<{ id: StoneTypeKey; label: string }> = [
  { id: "natural_diamonds", label: "Natural Diamonds" },
  { id: "lab_diamonds", label: "Lab Diamonds" },
  { id: "moissanite", label: "Moissanite" }
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
  const [emblemWarning, setEmblemWarning] = useState<string | null>(null);
  const [goldCombo, setGoldCombo] = useState<GoldComboKey>("YELLOW_WHITE");
  const [pendantSize, setPendantSize] = useState<PendantSizeKey>("2_3_inches");
  const [metalType, setMetalType] = useState<MetalTypeKey>("gold");
  const [stoneType, setStoneType] = useState<StoneTypeKey>("natural_diamonds");
  const [diamondQuality, setDiamondQuality] = useState<"vs" | "vvs">("vvs");
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);
  const [generations, setGenerations] = useState<GenerationOption[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewOption, setPreviewOption] = useState<GenerationOption | null>(null);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [capturedRequestId, setCapturedRequestId] = useState<string | null>(null);
  const [showAccessCodePrompt, setShowAccessCodePrompt] = useState(false);
  const [videoAccessCode, setVideoAccessCode] = useState("");
  const [videoStatus, setVideoStatus] = useState<VideoStatus | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [leadContact, setLeadContact] = useState<LeadContact | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<"idle" | "submitting" | "submitted">("idle");
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Incremented on each new generation kick-off; stale poll callbacks check this
  // before applying state so a cancelled request can't jump the user to step 4.
  const generationEpochRef = useRef(0);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoEpochRef = useRef(0);
  const videoPollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const pendantColumns = buildPendantColumns(pendantStyles);
  const activeStyle = pendantStyles.find(style => style.id === styleId) ?? pendantStyles[0];

  const selectedEmblem = emblemId ? emblems.find(asset => asset.id === emblemId) ?? null : null;
  const emblemSummary = includeEmblem ? (selectedEmblem ? selectedEmblem.label : "None selected") : "Not included";
  const activeGoldCombo = GOLD_COMBOS.find(option => option.id === goldCombo) ?? GOLD_COMBOS[0];
  const activePendantSize = PENDANT_SIZES.find(option => option.id === pendantSize) ?? PENDANT_SIZES[0];
  const activeMetalType = METAL_TYPES.find(option => option.id === metalType) ?? METAL_TYPES[0];
  const activeStoneType = STONE_TYPES.find(option => option.id === stoneType) ?? STONE_TYPES[0];
  const canAddLine = lines.length < MAX_NAME_LINES;
  const hasPrimaryName = lines[0]?.trim().length > 0;
  const highQualityGeneration = generations.find(generation => generation.variant === 1) ?? null;

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

  const cancelVideoPolling = () => {
    videoEpochRef.current += 1;
    if (videoPollTimeoutRef.current) {
      clearTimeout(videoPollTimeoutRef.current);
      videoPollTimeoutRef.current = null;
    }
    setIsVideoGenerating(false);
  };

  const confirmDiscardGenerations = () =>
    generations.length === 0 && !videoStatus ||
    window.confirm("You will lose your generated drafts and video progress if you leave this flow. Continue?");

  const handleHomeFromResults = () => {
    if (!confirmDiscardGenerations()) return;
    cancelPolling();
    cancelVideoPolling();
    router.push("/");
  };

  const handleBack = () => {
    if ((step === 4 || step === 5) && !confirmDiscardGenerations()) return;
    if (step === 0) {
      router.push("/pendants");
      return;
    }
    if (step === 4 || step === 5) {
      cancelPolling();
      cancelVideoPolling();
      setGenerations([]);
      setSelectedGenerationId(null);
      setShowLeadCapture(false);
      setShowAccessCodePrompt(false);
      setVideoStatus(null);
      setVideoError(null);
      setQuoteStatus("idle");
      setQuoteError(null);
    }
    const prevStep = step === 4 || step === 5 ? 2 : ((step - 1) as Step);
    setStep(prevStep as Step);
  };

  const handleNext = () => {
    if (step === 0 && !hasPrimaryName) return;
    if (step === 1 && includeEmblem && !emblemId) {
      setEmblemWarning("Please select an emblem before continuing, or turn the emblem option off.");
      return;
    }
    if (step > 1) return;
    setEmblemWarning(null);
    setStep(prev => ((prev + 1) as Step));
  };

  const isNextDisabled = step === 0 && !hasPrimaryName;
  const showFooterNext = step <= 1;

  const uppercaseButtonClass = uppercaseApplied
    ? "inline-flex items-center gap-2 rounded-2xl border border-[color:var(--theme-border-strong)] bg-[var(--theme-accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[var(--theme-accent-contrast)] transition hover:border-[color:var(--theme-border-hover)] hover:bg-[var(--theme-border-hover)]"
    : "inline-flex items-center gap-2 rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[var(--theme-text-soft)] transition hover:border-[color:var(--theme-border-hover)] hover:text-[var(--theme-text)]";

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
      emblem: emblemValue,
      size: pendantSize,
      metalType,
      stoneType
    };

    setGenerationError(null);
    setGenerations([]);
    setSelectedGenerationId(null);
    setLeadContact(null);
    setQuoteStatus("idle");
    setQuoteError(null);
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
      setCapturedRequestId(requestId);
      setShowLeadCapture(true);
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
          const attempts: GenerationAttempt[] = pollData.attempts ?? [];
          const failedAttempts = attempts.filter(attempt => attempt.status === "failed");
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
            if (!pollData.done && pollCount >= MAX_POLL_ATTEMPTS) {
              setGenerationError("Image generation timed out before all drafts finished. Please go back and try again.");
            } else if (failedAttempts.length > 0 && mapped.length === 0) {
              const firstError = failedAttempts.find(attempt => attempt.error)?.error;
              setGenerationError(firstError ?? "No successful drafts were generated. Please go back and try again.");
            } else if (failedAttempts.length > 0) {
              setGenerationError(`${failedAttempts.length} draft${failedAttempts.length === 1 ? "" : "s"} failed, but you can continue with the generated draft${mapped.length === 1 ? "" : "s"}.`);
            }
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

  const handleStartVideo = async () => {
    if (isVideoGenerating) return;
    if (!capturedRequestId) {
      setVideoError("Missing request id for this generation.");
      return;
    }
    if (!highQualityGeneration) {
      setVideoError("The higher quality draft is not ready yet.");
      return;
    }

    setVideoError(null);
    setVideoStatus(null);
    setQuoteStatus("idle");
    setQuoteError(null);
    setIsVideoGenerating(true);

    const epoch = ++videoEpochRef.current;
    try {
      const response = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: capturedRequestId, accessCode: videoAccessCode })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Failed to start video generation.");
      if (epoch !== videoEpochRef.current) return;

      const videoId: string = data.videoId;
      setShowAccessCodePrompt(false);
      setStep(5 as Step);
      let pollCount = 0;
      const poll = async () => {
        if (epoch !== videoEpochRef.current) return;
        pollCount += 1;
        try {
          const pollRes = await fetch(`/api/videos/${videoId}`);
          const pollData = await pollRes.json().catch(() => ({}));
          if (epoch !== videoEpochRef.current) return;

          setVideoStatus({
            id: videoId,
            status: pollData.status ?? "pending",
            videoUrl: pollData.videoUrl ?? null,
            error: pollData.error ?? null,
            durationSeconds: pollData.durationSeconds ?? null
          });

          if (pollData.done || pollCount >= MAX_VIDEO_POLL_ATTEMPTS) {
            videoPollTimeoutRef.current = null;
            setIsVideoGenerating(false);
            if (!pollData.done && pollCount >= MAX_VIDEO_POLL_ATTEMPTS) {
              setVideoError("Video generation timed out. Please try again.");
            } else if (pollData.status === "failed") {
              setVideoError(pollData.error ?? "Video generation failed.");
            }
            return;
          }
        } catch {
          // Keep polling through brief network hiccups.
        }
        videoPollTimeoutRef.current = setTimeout(poll, 3000);
      };

      void poll();
    } catch (error) {
      if (epoch !== videoEpochRef.current) return;
      setIsVideoGenerating(false);
      setVideoError(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  const handleQuoteRequest = async () => {
    if (quoteStatus === "submitting" || quoteStatus === "submitted") return;
    if (!capturedRequestId) {
      setQuoteError("Missing request id for this generation.");
      return;
    }

    setQuoteError(null);
    setQuoteStatus("submitting");
    try {
      const response = await fetch("/api/quote-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: capturedRequestId,
          videoId: videoStatus?.id,
          designedImageUrl: highQualityGeneration?.src,
          videoUrl: videoStatus?.videoUrl,
          diamondQuality,
          customerName: leadContact?.name,
          customerPhone: leadContact?.phone,
          customerEmail: leadContact?.email
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Failed to send quote request.");
      setQuoteStatus("submitted");
    } catch (error) {
      setQuoteStatus("idle");
      setQuoteError(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  // Clean up any pending poll on unmount
  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
      if (videoPollTimeoutRef.current) clearTimeout(videoPollTimeoutRef.current);
    };
  }, []);

  return (
    <>
    <main className="min-h-dvh px-4 py-4 text-[var(--theme-text)] md:px-8">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col px-4 pb-6 pt-4 sm:px-6 md:px-12">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
          <button
            type="button"
            onClick={handleBack}
            className="mb-6 flex w-fit items-center gap-2 rounded-full border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface-muted)] px-4 py-2 text-sm uppercase tracking-wide transition hover:border-[color:var(--theme-border-hover)]"
          >
            back
          </button>

          <header>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--theme-text-soft)]">{STEP_LABELS[step]}</p>
            <h1 className="mt-3 text-[2.15rem] font-semibold tracking-tight text-[var(--theme-heading)] md:text-[2.5rem]">Dream it first</h1>
            <p
              className="-mt-1 text-[1.7rem] italic text-[var(--theme-script)]"
              style={{ fontFamily: "var(--font-nostalgic)" }}
            >
              we&apos;ll build it.
            </p>
          </header>

          <section className="mt-4 flex-1">
            {step === 0 && (
              <div className="space-y-7">
                <div>
                  <label className="text-sm font-medium tracking-wide text-[var(--theme-text-soft)]">Text on Pendant</label>
                  <div className="mt-3 space-y-3">
                    {lines.map((value, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <input
                          value={value}
                          onChange={event => updateLine(event.target.value, index)}
                          placeholder={index === 0 ? "text on pendant..." : "add another line"}
                          className="flex-1 rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-base outline-none transition focus:border-[color:var(--theme-border-hover)]"
                        />
                        <div className="flex items-center gap-2">
                          {lines.length > 1 && index > 0 && (
                            <button
                              type="button"
                              onClick={() => removeLine(index)}
                              className="h-11 w-11 rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] text-2xl font-semibold leading-none text-[var(--theme-text-soft)] transition hover:border-[color:var(--theme-border-hover)]"
                              aria-label="Remove name line"
                            >
                              -
                            </button>
                          )}
                          {index === lines.length - 1 && canAddLine && (
                            <button
                              type="button"
                              onClick={addLine}
                              className="h-11 w-11 rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] text-2xl font-semibold leading-none text-[var(--theme-text-soft)] transition hover:border-[color:var(--theme-border-hover)]"
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
                  <p className="mt-1 text-sm text-[var(--theme-text-soft)]">Swipe through to explore different pendant looks.</p>
                  <div className="mt-4 -mx-4 overflow-x-auto px-4 pb-5 pt-1">
                    <div className="flex snap-x snap-mandatory gap-4">
                      {pendantColumns.map((column, columnIndex) => (
                        <div key={columnIndex} className="grid min-w-[192px] grid-rows-2 gap-3 snap-start">
                          {column.map(style => {
                            const isActive = style.id === styleId;
                            return (
                              <ThemedImageOption
                                key={style.id}
                                onClick={() => setStyleId(style.id)}
                                selected={isActive}
                                src={style.src}
                                label={`${style.label} pendant style`}
                              />
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
              <div className="space-y-4">
                {/* Emblem step: toggle, picker, gold tones. */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Emblem</h2>
                    <p className="text-sm text-[var(--theme-text-soft)]">Add a symbol on top of the pendant where the chain loops through.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIncludeEmblem(value => !value);
                      setEmblemWarning(null);
                    }}
                    className={`relative h-7 w-12 rounded-full border-2 border-[color:var(--theme-border)] transition ${includeEmblem ? "bg-[var(--theme-accent)]" : "bg-[var(--theme-surface)]"}`}
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
                  onSelect={nextEmblem => {
                    setEmblemId(nextEmblem);
                    if (nextEmblem) setEmblemWarning(null);
                  }}
                  disabled={!includeEmblem}
                />

                <div className="pt-5 sm:pt-6">
                  <h2 className="text-left text-lg font-semibold">Select Color Combo</h2>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {GOLD_COMBOS.map(option => {
                      const isActive = goldCombo === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setGoldCombo(option.id)}
                          aria-pressed={isActive}
                          className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${isActive ? "border-[3px] border-[color:var(--theme-selected-border)] bg-[var(--theme-selected-bg)] text-[var(--theme-text)]" : "border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text-soft)] hover:border-[color:var(--theme-border-hover)]"}`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  <h2 className="text-left text-lg font-semibold">Size</h2>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {PENDANT_SIZES.map(option => {
                      const isActive = pendantSize === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setPendantSize(option.id)}
                          aria-pressed={isActive}
                          className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${isActive ? "border-[3px] border-[color:var(--theme-selected-border)] bg-[var(--theme-selected-bg)] text-[var(--theme-text)]" : "border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text-soft)] hover:border-[color:var(--theme-border-hover)]"}`}
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
                  <h2 className="text-xl font-semibold">Metal Type</h2>
                  <p className="mt-1 text-sm text-[var(--theme-text-soft)]">This does not affect the color of your pendant.</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {METAL_TYPES.map(option => {
                      const isActive = metalType === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setMetalType(option.id)}
                          aria-pressed={isActive}
                          className={`min-w-[92px] rounded-2xl border px-4 py-2 text-base font-semibold transition ${isActive ? "border-[3px] border-[color:var(--theme-selected-border)] bg-[var(--theme-selected-bg)]" : "border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] hover:border-[color:var(--theme-border-hover)]"}`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold">Stone Type</h2>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {STONE_TYPES.map(option => {
                      const isActive = stoneType === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setStoneType(option.id)}
                          aria-pressed={isActive}
                          className={`rounded-2xl border px-4 py-2 text-base font-semibold transition ${isActive ? "border-[3px] border-[color:var(--theme-selected-border)] bg-[var(--theme-selected-bg)]" : "border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] hover:border-[color:var(--theme-border-hover)]"}`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold">Diamond Quality</h2>
                  <div className="mt-4 flex gap-3">
                    {(["vs", "vvs"] as const).map(option => {
                      const isActive = diamondQuality === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setDiamondQuality(option)}
                          aria-pressed={isActive}
                          className={`min-w-[72px] rounded-2xl border px-4 py-2 text-lg uppercase transition ${isActive ? "border-[3px] border-[color:var(--theme-selected-border)] bg-[var(--theme-selected-bg)]" : "border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] hover:border-[color:var(--theme-border-hover)]"}`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm uppercase tracking-[0.35em] text-[var(--theme-text-soft)]">Drafting your imagination...</h3>
                  <div className="mt-4 rounded-3xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] p-4">
                    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[var(--theme-surface-strong)]">
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
                    <dl className="mt-4 space-y-2 text-sm text-[var(--theme-text-soft)]">
                      <div className="flex justify-between">
                        <dt>Name</dt>
                        <dd className="font-medium text-[var(--theme-text)]">{lines.filter(Boolean).join(" ") || "Your idea"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Style</dt>
                        <dd className="font-medium text-[var(--theme-text)]">{activeStyle?.label}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Gold</dt>
                        <dd className="font-medium text-[var(--theme-text)]">{activeGoldCombo.summary}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Size</dt>
                        <dd className="font-medium text-[var(--theme-text)]">{activePendantSize.label}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Metal Type</dt>
                        <dd className="font-medium text-[var(--theme-text)]">{activeMetalType.label}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Stone Type</dt>
                        <dd className="font-medium text-[var(--theme-text)]">{activeStoneType.label}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Emblem</dt>
                        <dd className="font-medium text-[var(--theme-text)]">{emblemSummary}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Diamond</dt>
                        <dd className="font-medium text-[var(--theme-text)]">{diamondQuality.toUpperCase()}</dd>
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
                      className="flex-1 rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] px-5 py-3 text-base font-medium transition hover:border-[color:var(--theme-border-hover)]"
                    >
                      edit
                    </button>
                    <button
                      type="button"
                      onClick={handleAcceptDesign}
                      disabled={isGenerating}
                      className={`flex-1 rounded-2xl px-5 py-3 text-base font-semibold transition ${isGenerating ? 'cursor-wait border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text-muted)]' : 'bg-[var(--theme-accent)] text-[var(--theme-accent-contrast)] hover:bg-[var(--theme-border-hover)]'}`}
                    >
                      {isGenerating ? 'submitting...' : 'accept'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8">
                <div className="rounded-3xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface-muted)] px-6 py-6">
                  <h2 className="text-lg font-semibold text-center sm:text-left">
                    {isGenerating ? "Drafting your designs…" : "Choose your favourite"}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--theme-text-soft)] text-center sm:text-left">
                    {isGenerating
                      ? "Designs appear as they're generated — pick your favourite when ready."
                      : "Select the draft that matches your vision best. We'll refine the winner for production."}
                  </p>
                  {isGenerating && (
                    <p className="mt-1 text-xs text-[var(--theme-text-muted)] text-center sm:text-left">
                      {generations.length} of 2 generated
                    </p>
                  )}
                  {generationError && (
                    <div className="mt-4 rounded-2xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {generationError}
                    </div>
                  )}
                  <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {([1, 2] as const).map(variantNum => {
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
                            className={`group relative block w-full overflow-hidden rounded-[32px] ${isSelected ? "border-[3px] border-[color:var(--theme-selected-border)] shadow-[0_0_35px_var(--theme-selected-glow)]" : "border-2 border-[color:var(--theme-border)]"} bg-[var(--theme-surface-muted)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-selected-border)]`}
                            aria-pressed={isSelected}
                            aria-label={option.label}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={option.src}
                              alt={option.label}
                              className="block h-auto w-full transition duration-500 group-hover:scale-105"
                            />
                            <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-transparent via-transparent to-black/20" aria-hidden />
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
                    onClick={handleHomeFromResults}
                    className="flex-1 rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] px-5 py-3 text-base font-medium transition hover:border-[color:var(--theme-border-hover)]"
                  >
                    home
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVideoError(null);
                      setShowAccessCodePrompt(true);
                    }}
                    disabled={!highQualityGeneration || isGenerating}
                    className={`flex-1 rounded-2xl px-5 py-3 text-base font-semibold transition ${highQualityGeneration && !isGenerating ? "bg-red-600 text-white hover:bg-red-500" : "cursor-not-allowed border border-white/15 bg-black/45 text-white/50"}`}
                  >
                    Generate Video
                  </button>
                </div>
                {videoError && (
                  <div className="rounded-2xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {videoError}
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-8">
                <div className="rounded-3xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface-muted)] px-6 py-6">
                  <h2 className="text-lg font-semibold text-center sm:text-left">
                    {isVideoGenerating ? "Generating your video…" : "Your video"}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--theme-text-soft)] text-center sm:text-left">
                    {isVideoGenerating
                      ? "Seedance is animating the higher-quality draft. This usually takes a little longer than images."
                      : "Preview the generated pendant video below."}
                  </p>

                  <div className="mt-6 overflow-hidden rounded-[32px] border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)]">
                    {videoStatus?.videoUrl ? (
                      <video
                        src={videoStatus.videoUrl}
                        controls
                        playsInline
                        className="block w-full bg-black"
                      />
                    ) : (
                      <div className="flex min-h-[360px] items-center justify-center p-8 text-center text-sm text-white/55">
                        {videoError ? "Video generation did not complete." : "Waiting for the video file..."}
                      </div>
                    )}
                  </div>

                  {videoStatus?.durationSeconds && (
                    <p className="mt-3 text-xs text-[var(--theme-text-muted)]">
                      Generated in {videoStatus.durationSeconds.toFixed(2)} seconds.
                    </p>
                  )}

                  {videoError && (
                    <div className="mt-4 rounded-2xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {videoError}
                    </div>
                  )}

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleHomeFromResults}
                      className="flex-1 rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] px-5 py-3 text-base font-medium transition hover:border-[color:var(--theme-border-hover)]"
                    >
                      home
                    </button>
                    {videoStatus?.videoUrl ? (
                      <button
                        type="button"
                        onClick={handleQuoteRequest}
                        disabled={quoteStatus !== "idle"}
                        className={`flex-1 rounded-2xl px-5 py-3 text-center text-base font-semibold text-white transition ${
                          quoteStatus === "submitted"
                            ? "cursor-default bg-emerald-600"
                            : quoteStatus === "submitting"
                              ? "cursor-wait bg-[var(--theme-accent)]/70"
                              : "bg-[var(--theme-accent)] text-[var(--theme-accent-contrast)] hover:bg-[var(--theme-border-hover)]"
                        }`}
                      >
                        {quoteStatus === "submitting" ? "sending..." : quoteStatus === "submitted" ? "sent" : "get a quote"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex-1 cursor-wait rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] px-5 py-3 text-base font-semibold text-[var(--theme-text-muted)]"
                      >
                        {isVideoGenerating ? "generating..." : "no video yet"}
                      </button>
                    )}
                  </div>
                  {quoteStatus === "submitted" && (
                    <div className="mt-4 rounded-2xl border border-emerald-400/50 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-50">
                      your Design has been sent! We will reach back soon through email or test
                    </div>
                  )}
                  {quoteError && (
                    <div className="mt-4 rounded-2xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {quoteError}
                    </div>
                  )}
                </div>
              </div>
            )}

          </section>

          <footer className="mt-6 flex items-center justify-between">
            <span className="w-16" aria-hidden />

            <div className="flex items-center justify-center gap-2">
              {/* Show 4 dots for the 4 visible steps (0,1,2,4) — step 3 is transient */}
              {([0, 1, 2, 4, 5] as const).map(idx => (
                <span
                  key={idx}
                  className={`h-2.5 w-2.5 rounded-full transition ${idx === step ? "bg-[var(--theme-accent)]" : "bg-white/25"}`}
                />
              ))}
            </div>

            {showFooterNext ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={isNextDisabled}
                aria-disabled={isNextDisabled}
                className={`rounded-full border px-4 py-2 text-sm uppercase tracking-wide transition ${isNextDisabled ? "cursor-not-allowed border-white/20 bg-white/5 text-white/40" : "border-[color:var(--theme-selected-border)] bg-[var(--theme-selected-bg)] text-[var(--theme-text)] hover:bg-[var(--theme-accent)] hover:text-[var(--theme-accent-contrast)]"}`}
              >
                next
              </button>
            ) : (
              <span className="w-16" aria-hidden />
            )}
          </footer>
          {step === 1 && emblemWarning && (
            <div className="mt-4 rounded-2xl border border-amber-300/60 bg-amber-300/12 px-4 py-3 text-sm font-medium text-amber-50">
              {emblemWarning}
            </div>
          )}

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

    {showAccessCodePrompt && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Generate video"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      >
        <form
          onSubmit={event => {
            event.preventDefault();
            void handleStartVideo();
          }}
          className="w-full max-w-sm rounded-3xl border border-white/15 bg-[#1d120c] p-6 shadow-2xl"
        >
          <h2 className="text-lg font-semibold text-white">Generate Video</h2>
          <p className="mt-2 text-sm text-white/60">
            Enter the internal access code to animate the higher-quality draft.
          </p>
          <label className="mt-5 block text-sm text-white/70">
            Access code
            <input
              value={videoAccessCode}
              onChange={event => setVideoAccessCode(event.target.value)}
              autoFocus
              className="mt-2 w-full rounded-2xl border border-white/15 bg-black/45 px-4 py-3 text-base text-white outline-none transition focus:border-red-400"
            />
          </label>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowAccessCodePrompt(false);
                setVideoAccessCode("");
              }}
              className="flex-1 rounded-2xl border border-white/15 bg-black/45 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/35"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={!videoAccessCode.trim() || isVideoGenerating}
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${videoAccessCode.trim() && !isVideoGenerating ? "bg-red-600 text-white hover:bg-red-500" : "cursor-not-allowed border border-white/15 bg-black/45 text-white/50"}`}
            >
              generate
            </button>
          </div>
        </form>
      </div>
    )}

    {showLeadCapture && (
      <LeadCaptureModal
        requestId={capturedRequestId}
        onSubmitted={(lead) => {
          setLeadContact(lead);
          setShowLeadCapture(false);
        }}
      />
    )}
    </>
  );
}
