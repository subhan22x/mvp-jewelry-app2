"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ThemedImageOption from "../components/ThemedImageOption";
import ThemedOptionButton from "../components/ThemedOptionButton";
import DesignProgressBar from "../components/DesignProgressBar";
import EmblemPicker from "./components/EmblemPicker";
import LeadCaptureModal from "./components/LeadCaptureModal";
import { pendantStyles, emblems, type PendantStyle } from "@/lib/assets";
import { cx, panelClass, styleOptionFrameClass, themeBorder, themeFocusRing, themeRadius, themeSurface } from "@/src/lib/theme/ui-classes";

type Step = 0 | 1 | 2 | 3 | 4 | 5;

// Poll up to 50 times (× 2 s = 100 s) before giving up
const MAX_POLL_ATTEMPTS = 50;
const MAX_VIDEO_POLL_ATTEMPTS = 80;
type GoldComboKey = "YELLOW_WHITE" | "ROSE_WHITE" | "WHITE";
type PendantSizeKey = "2_3_inches" | "3_4_5_inches" | "4_5_7_inches" | "7_10_inches";
type MetalTypeKey = "gold" | "silver";
type StoneTypeKey = "natural_diamonds" | "lab_diamonds" | "moissanite";
type PendantFinishKey = "icedout" | "plain";
type PlainStyleKey = "plain_style_1" | "plain_style_2" | "plain_style_3" | "plain_style_4" | "plain_style_5" | "plain_style_6";
type PlainColorKey = "gold" | "silver" | "rose_gold";
type PlainMetalKey = "gold_plated" | "silver" | "gold";
type PlainKaratKey = "10k" | "14k" | "18k";
type PlainChainKey = "rope" | "box" | "snake" | "cable" | "station" | "bar_link_tube_station" | "figaro_oval_link";

type GenerationOption = {
  id: string;
  label: string;
  src: string;
  variant: number;
  kind: "original" | "revision";
  sourceGenerationId?: string;
  revisionNumber?: 1 | 2;
  editPrompt?: string;
  status?: "pending" | "succeeded" | "failed";
};
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

function progressStepForBuilder(step: Step) {
  if (step === 0) return 0;
  if (step === 1) return 1;
  if (step === 2 || step === 3) return 2;
  return 3;
}

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

const GOLD_COMBO_SWATCH_CLASS: Record<GoldComboKey, string> = {
  YELLOW_WHITE: "from-[#f8cf61] via-[#f6c456] to-[#e9edf2]",
  ROSE_WHITE: "from-[#e3a07e] via-[#d88b6d] to-[#eef1f5]",
  WHITE: "from-[#fbfdff] via-[#dce4ee] to-[#aeb9c7]"
};

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

const PLAIN_STYLES: ReadonlyArray<{ id: PlainStyleKey; label: string; src: string }> = [
  { id: "plain_style_1", label: "Amour", src: "/plain-pendants/plain_style_1.png" },
  { id: "plain_style_2", label: "Olivia", src: "/plain-pendants/plain_style_2.png" },
  { id: "plain_style_3", label: "Hayley", src: "/plain-pendants/plain_style_3.png" },
  { id: "plain_style_4", label: "Paige", src: "/plain-pendants/plain_style_4.png" },
  { id: "plain_style_5", label: "Audrey", src: "/plain-pendants/plain_style_5.png" },
  { id: "plain_style_6", label: "Wesley", src: "/plain-pendants/plain_style_6.png" }
];

const PLAIN_COLORS: ReadonlyArray<{ id: PlainColorKey; label: string; summary: string }> = [
  { id: "gold", label: "Gold", summary: "Gold" },
  { id: "silver", label: "Silver", summary: "Silver" },
  { id: "rose_gold", label: "Rose Gold", summary: "Rose gold" }
];

const PLAIN_METALS: ReadonlyArray<{ id: PlainMetalKey; label: string }> = [
  { id: "gold_plated", label: "Gold Plated" },
  { id: "silver", label: "Silver" },
  { id: "gold", label: "Gold" }
];

const PLAIN_KARATS: ReadonlyArray<{ id: PlainKaratKey; label: string }> = [
  { id: "10k", label: "10K" },
  { id: "14k", label: "14K" },
  { id: "18k", label: "18K" }
];

const PLAIN_CHAINS: ReadonlyArray<{ id: PlainChainKey; label: string }> = [
  { id: "rope", label: "Rope chain" },
  { id: "box", label: "Box chain" },
  { id: "snake", label: "Snake chain" },
  { id: "cable", label: "Cable chain" },
  { id: "station", label: "Station chain" },
  { id: "bar_link_tube_station", label: "Bar link chain / tube station chain" },
  { id: "figaro_oval_link", label: "Figaro style / oval link chain" }
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

type NameBuilderProps = {
  mode?: PendantFinishKey;
  backHref?: string;
};

export default function NameBuilder({ mode = "icedout", backHref = "/pendants" }: NameBuilderProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [lines, setLines] = useState<string[]>([""]);
  const [uppercaseApplied, setUppercaseApplied] = useState(false);
  const pendantFinish = mode;
  const [styleId, setStyleId] = useState<string>(pendantStyles[0]?.id ?? "");
  const [plainStyleId, setPlainStyleId] = useState<PlainStyleKey>("plain_style_1");
  const [includeEmblem, setIncludeEmblem] = useState(true);
  const [emblemId, setEmblemId] = useState<string | null>(null);
  const [emblemWarning, setEmblemWarning] = useState<string | null>(null);
  const [goldCombo, setGoldCombo] = useState<GoldComboKey>("YELLOW_WHITE");
  const [pendantSize, setPendantSize] = useState<PendantSizeKey>("2_3_inches");
  const [metalType, setMetalType] = useState<MetalTypeKey>("gold");
  const [stoneType, setStoneType] = useState<StoneTypeKey>("natural_diamonds");
  const [diamondQuality, setDiamondQuality] = useState<"vs" | "vvs">("vvs");
  const [plainColor, setPlainColor] = useState<PlainColorKey>("gold");
  const [plainMetal, setPlainMetal] = useState<PlainMetalKey>("gold_plated");
  const [plainKarat, setPlainKarat] = useState<PlainKaratKey>("14k");
  const [plainChain, setPlainChain] = useState<PlainChainKey>("rope");
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);
  const [generations, setGenerations] = useState<GenerationOption[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewOption, setPreviewOption] = useState<GenerationOption | null>(null);
  const [editTarget, setEditTarget] = useState<GenerationOption | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [isRevisionSubmitting, setIsRevisionSubmitting] = useState(false);
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
  const revisionPollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const pendantColumns = buildPendantColumns(pendantStyles);
  const activeStyle = pendantStyles.find(style => style.id === styleId) ?? pendantStyles[0];
  const activePlainStyle = PLAIN_STYLES.find(style => style.id === plainStyleId) ?? PLAIN_STYLES[0];
  const isPlain = pendantFinish === "plain";

  const selectedEmblem = emblemId ? emblems.find(asset => asset.id === emblemId) ?? null : null;
  const emblemSummary = includeEmblem ? (selectedEmblem ? selectedEmblem.label : "None selected") : "Not included";
  const activeGoldCombo = GOLD_COMBOS.find(option => option.id === goldCombo) ?? GOLD_COMBOS[0];
  const activePendantSize = PENDANT_SIZES.find(option => option.id === pendantSize) ?? PENDANT_SIZES[0];
  const activeMetalType = METAL_TYPES.find(option => option.id === metalType) ?? METAL_TYPES[0];
  const activeStoneType = STONE_TYPES.find(option => option.id === stoneType) ?? STONE_TYPES[0];
  const activePlainColor = PLAIN_COLORS.find(option => option.id === plainColor) ?? PLAIN_COLORS[0];
  const activePlainMetal = PLAIN_METALS.find(option => option.id === plainMetal) ?? PLAIN_METALS[0];
  const activePlainKarat = PLAIN_KARATS.find(option => option.id === plainKarat) ?? PLAIN_KARATS[1];
  const activePlainChain = PLAIN_CHAINS.find(option => option.id === plainChain) ?? PLAIN_CHAINS[0];
  const canAddLine = lines.length < MAX_NAME_LINES;
  const hasPrimaryName = lines[0]?.trim().length > 0;
  const highQualityGeneration = generations.find(generation => generation.variant === 1) ?? null;
  const revisionGenerations = generations
    .filter(generation => generation.kind === "revision")
    .sort((a, b) => (a.revisionNumber ?? 0) - (b.revisionNumber ?? 0));
  const selectedGeneration = generations.find(generation => generation.id === selectedGenerationId) ?? highQualityGeneration;
  const canCreateRevision = revisionGenerations.length < 2;

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

  const cancelRevisionPolling = () => {
    if (revisionPollTimeoutRef.current) {
      clearTimeout(revisionPollTimeoutRef.current);
      revisionPollTimeoutRef.current = null;
    }
    setIsRevisionSubmitting(false);
  };

  const confirmDiscardGenerations = () =>
    generations.length === 0 && !videoStatus ||
    window.confirm("You will lose your generated drafts and video progress if you leave this flow. Continue?");

  const handleBack = () => {
    if ((step === 4 || step === 5) && !confirmDiscardGenerations()) return;
    if (step === 0) {
      router.push(backHref);
      return;
    }
    if (step === 4 || step === 5) {
      cancelPolling();
      cancelVideoPolling();
      cancelRevisionPolling();
      setGenerations([]);
      setSelectedGenerationId(null);
      setEditTarget(null);
      setEditPrompt("");
      setRevisionError(null);
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
    if (step === 1 && !isPlain && includeEmblem && !emblemId) {
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

    const payload = isPlain ? {
      userId: 'demo',
      pendantFinish,
      styleId: plainStyleId,
      text: trimmedLines.join('\n'),
      plainColor,
      plainMetal,
      plainKarat: plainMetal === "gold" ? plainKarat : null,
      plainChain
    } : {
      userId: 'demo',
      pendantFinish,
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
    setEditTarget(null);
    setEditPrompt("");
    setRevisionError(null);
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

          const results: Array<{ id?: string; variant: number; imageUrl: string }> = pollData.results ?? [];
          const attempts: GenerationAttempt[] = pollData.attempts ?? [];
          const failedAttempts = attempts.filter(attempt => attempt.status === "failed");
          const mapped: GenerationOption[] = results.map(r => ({
            id: r.id ?? `variant-${r.variant}`,
            label: `Draft ${r.variant}`,
            src: r.imageUrl,
            variant: r.variant,
            kind: "original",
            sourceGenerationId: r.id ?? `variant-${r.variant}`,
            status: "succeeded"
          }));
          setGenerations(prev => [
            ...mapped,
            ...prev.filter(generation => generation.kind === "revision")
          ]);
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

  const handleOpenEdit = (option: GenerationOption) => {
    if (!canCreateRevision || option.status === "pending") return;
    setEditTarget(option);
    setEditPrompt("");
    setRevisionError(null);
  };

  const pollRevision = (requestId: string, revisionId: string, placeholderId: string) => {
    let pollCount = 0;
    const poll = async () => {
      pollCount += 1;
      try {
        const response = await fetch(`/api/requests/${requestId}/revisions/${revisionId}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error ?? "Failed to check revision.");

        if (data.done || pollCount >= MAX_POLL_ATTEMPTS) {
          revisionPollTimeoutRef.current = null;
          setIsRevisionSubmitting(false);
          if (data.status === "succeeded" && data.imageUrl) {
            setGenerations(prev => prev.map(generation =>
              generation.id === placeholderId || generation.id === revisionId
                ? {
                    ...generation,
                    id: revisionId,
                    label: `Rev ${data.revisionNumber}`,
                    src: data.imageUrl,
                    status: "succeeded",
                    variant: 100 + data.revisionNumber
                  }
                : generation
            ));
            setSelectedGenerationId(revisionId);
          } else {
            setGenerations(prev => prev.map(generation =>
              generation.id === placeholderId || generation.id === revisionId
                ? { ...generation, id: revisionId, status: "failed" }
                : generation
            ));
            setRevisionError(data.error ?? "Revision did not complete. Please try again.");
          }
          return;
        }
      } catch (error) {
        if (pollCount >= MAX_POLL_ATTEMPTS) {
          revisionPollTimeoutRef.current = null;
          setIsRevisionSubmitting(false);
          setGenerations(prev => prev.map(generation =>
            generation.id === placeholderId || generation.id === revisionId
              ? { ...generation, id: revisionId, status: "failed" }
              : generation
          ));
          setRevisionError(error instanceof Error ? error.message : "Revision did not complete.");
          return;
        }
      }
      revisionPollTimeoutRef.current = setTimeout(poll, 1200);
    };

    void poll();
  };

  const handleSubmitRevision = async () => {
    if (!capturedRequestId || !editTarget || isRevisionSubmitting) return;
    if (!canCreateRevision) {
      setRevisionError("This design already has the maximum of 2 revisions.");
      return;
    }

    const prompt = editPrompt.trim();
    if (!prompt) {
      setRevisionError("Describe the changes you want first.");
      return;
    }

    const revisionNumber = (revisionGenerations.length + 1) as 1 | 2;
    const sourceResultId = editTarget.sourceGenerationId ?? editTarget.id;
    const placeholderId = `pending-revision-${revisionNumber}`;
    setRevisionError(null);
    setIsRevisionSubmitting(true);
    setGenerations(prev => [
      ...prev,
      {
        id: placeholderId,
        label: `Rev ${revisionNumber}`,
        src: "",
        variant: 100 + revisionNumber,
        kind: "revision",
        sourceGenerationId: sourceResultId,
        revisionNumber,
        editPrompt: prompt,
        status: "pending"
      }
    ]);
    setEditTarget(null);
    setEditPrompt("");

    try {
      const response = await fetch(`/api/requests/${capturedRequestId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceResultId, prompt })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Failed to start revision.");
      const revisionId: string = data.revisionId;
      setGenerations(prev => prev.map(generation =>
        generation.id === placeholderId ? { ...generation, id: revisionId } : generation
      ));
      pollRevision(capturedRequestId, revisionId, placeholderId);
    } catch (error) {
      setIsRevisionSubmitting(false);
      setGenerations(prev => prev.filter(generation => generation.id !== placeholderId));
      setRevisionError(error instanceof Error ? error.message : "Failed to start revision.");
    }
  };

  const handleStartVideo = async () => {
    if (isVideoGenerating) return;
    if (!capturedRequestId) {
      setVideoError("Missing request id for this generation.");
      return;
    }
    if (!selectedGeneration?.src) {
      setVideoError("Select a finished draft before generating video.");
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
        body: JSON.stringify({
          requestId: capturedRequestId,
          accessCode: videoAccessCode,
          sourceResultId: selectedGeneration.kind === "original" ? selectedGeneration.id : undefined,
          sourceImageUrl: selectedGeneration.src
        })
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
          designedImageUrl: selectedGeneration?.src ?? highQualityGeneration?.src,
          videoUrl: videoStatus?.videoUrl,
          diamondQuality: isPlain ? undefined : diamondQuality,
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
      if (revisionPollTimeoutRef.current) clearTimeout(revisionPollTimeoutRef.current);
    };
  }, []);

  return (
    <>
    <main className="min-h-dvh px-4 py-4 text-[var(--theme-text)] md:px-8">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col px-4 pb-6 pt-4 sm:px-6 md:px-12">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
          <div className="mb-8 grid min-h-10 grid-cols-[2.5rem_1fr_2.5rem] items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back"
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface-muted)] text-xl leading-none text-[var(--theme-text)] transition hover:border-[color:var(--theme-border-hover)]"
            >
              ←
            </button>
            <DesignProgressBar current={progressStepForBuilder(step)} className="justify-self-center" />
            <span aria-hidden="true" />
          </div>

          <header>
            <h1 className="text-[2.15rem] font-semibold tracking-tight text-[var(--theme-heading)] md:text-[2.5rem]">Dream it first</h1>
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
                  <p className="mt-1 text-sm text-[var(--theme-text-soft)]">
                    {isPlain ? "Pick a nameplate style." : "Swipe through to explore different pendant looks."}
                  </p>
                  {isPlain ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {PLAIN_STYLES.map(style => {
                        const isActive = plainStyleId === style.id;
                        return (
                          <ThemedImageOption
                            key={style.id}
                            onClick={() => setPlainStyleId(style.id)}
                            selected={isActive}
                            src={style.src}
                            label={style.label}
                            className={cx("aspect-square w-full min-w-0", themeRadius.imageOption)}
                            imageSizes="(max-width: 640px) 45vw, (max-width: 1024px) 28vw, 220px"
                            imageClassName="object-contain object-center p-3 transition duration-500 group-hover:scale-105"
                          />
                        );
                      })}
                    </div>
                  ) : (
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
                                  className={styleOptionFrameClass}
                                />
                              );
                            })}
                            {column.length === 1 && (
                              <div className={cx("h-[184px] w-[184px] border border-transparent", themeRadius.imageOption)} aria-hidden />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                {isPlain ? (
                  <>
                    <div>
                      <h2 className="text-lg font-semibold">Color</h2>
                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {PLAIN_COLORS.map(option => (
                          <ThemedOptionButton
                            key={option.id}
                            selected={plainColor === option.id}
                            onClick={() => setPlainColor(option.id)}
                          >
                            {option.label}
                          </ThemedOptionButton>
                        ))}
                      </div>
                    </div>

                    <div className="pt-5">
                      <h2 className="text-lg font-semibold">Metal</h2>
                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {PLAIN_METALS.map(option => (
                          <ThemedOptionButton
                            key={option.id}
                            selected={plainMetal === option.id}
                            onClick={() => setPlainMetal(option.id)}
                          >
                            {option.label}
                          </ThemedOptionButton>
                        ))}
                      </div>
                    </div>

                    {plainMetal === "gold" && (
                      <div className="pt-5">
                        <h2 className="text-lg font-semibold">Karat</h2>
                        <div className="mt-4 flex flex-wrap gap-3">
                          {PLAIN_KARATS.map(option => (
                            <ThemedOptionButton
                              key={option.id}
                              selected={plainKarat === option.id}
                              onClick={() => setPlainKarat(option.id)}
                              size="sm"
                              minWidthClass="min-w-[76px]"
                            >
                              {option.label}
                            </ThemedOptionButton>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-5">
                      <h2 className="text-lg font-semibold">Chain Style</h2>
                      <div className="mt-4 overflow-hidden rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)]">
                        <Image
                          src="/plain-pendants/chain-options.png"
                          alt="Chain style examples"
                          width={1055}
                          height={1252}
                          className="h-auto w-full"
                        />
                      </div>
                      <label className="mt-4 block text-sm text-[var(--theme-text-soft)]">
                        Chain
                        <select
                          value={plainChain}
                          onChange={event => setPlainChain(event.target.value as PlainChainKey)}
                          aria-label="Chain"
                          className="mt-2 w-full rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-base font-semibold text-[var(--theme-text)] outline-none transition focus:border-[color:var(--theme-selected-border)]"
                        >
                          {PLAIN_CHAINS.map(option => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </>
                ) : (
                  <>
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
                            <ThemedOptionButton
                              key={option.id}
                              selected={isActive}
                              onClick={() => setGoldCombo(option.id)}
                              className="min-h-14"
                            >
                              <span className="flex items-center justify-center gap-3">
                                <span
                                  className={cx(
                                    "relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/45 bg-gradient-to-br shadow-[inset_0_1px_2px_rgba(255,255,255,0.75),0_2px_8px_rgba(0,0,0,0.22)]",
                                    GOLD_COMBO_SWATCH_CLASS[option.id]
                                  )}
                                  aria-hidden="true"
                                >
                                  {option.id !== "WHITE" && (
                                    <span className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-br from-white via-[#edf2f8] to-[#b9c2ce]" />
                                  )}
                                  <span className="absolute inset-[3px] rounded-full border border-white/55" />
                                </span>
                                <span>{option.label}</span>
                              </span>
                            </ThemedOptionButton>
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
                            <ThemedOptionButton
                              key={option.id}
                              selected={isActive}
                              onClick={() => setPendantSize(option.id)}
                            >
                              {option.label}
                            </ThemedOptionButton>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8">
                {/* Final confirmation screen details. */}
                {!isPlain && (
                  <>
                    <div>
                      <h2 className="text-xl font-semibold">Metal Type</h2>
                      <p className="mt-1 text-sm text-[var(--theme-text-soft)]">This does not affect the color of your pendant.</p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        {METAL_TYPES.map(option => {
                          const isActive = metalType === option.id;
                          return (
                            <ThemedOptionButton
                              key={option.id}
                              selected={isActive}
                              onClick={() => setMetalType(option.id)}
                              size="sm"
                              minWidthClass="min-w-[92px]"
                            >
                              {option.label}
                            </ThemedOptionButton>
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
                            <ThemedOptionButton
                              key={option.id}
                              selected={isActive}
                              onClick={() => setStoneType(option.id)}
                              size="sm"
                            >
                              {option.label}
                            </ThemedOptionButton>
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
                            <ThemedOptionButton
                              key={option}
                              selected={isActive}
                              onClick={() => setDiamondQuality(option)}
                              size="lg"
                              minWidthClass="min-w-[72px]"
                              uppercase
                            >
                              {option}
                            </ThemedOptionButton>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <h3 className="text-sm uppercase tracking-[0.35em] text-[var(--theme-text-soft)]">Drafting your imagination...</h3>
                  <div className={panelClass("mt-4 p-4")}>
	                    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[var(--theme-surface-strong)]">
	                      {isPlain ? (
                          <Image
                            src={activePlainStyle.src}
                            alt={`${activePlainStyle.label} preview`}
                            fill
                            sizes="(max-width: 640px) 220px, 360px"
                            className="object-cover"
                            priority={false}
                          />
                        ) : activeStyle && (
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
	                        <dt>Finish</dt>
	                        <dd className="font-medium text-[var(--theme-text)]">{isPlain ? "Plain" : "Icedout"}</dd>
	                      </div>
                        {isPlain ? (
                          <>
                            <div className="flex justify-between">
                              <dt>Style</dt>
                              <dd className="font-medium text-[var(--theme-text)]">{activePlainStyle.label}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt>Color</dt>
                              <dd className="font-medium text-[var(--theme-text)]">{activePlainColor.label}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt>Metal</dt>
                              <dd className="font-medium text-[var(--theme-text)]">{activePlainMetal.label}</dd>
                            </div>
                            {plainMetal === "gold" && (
                              <div className="flex justify-between">
                                <dt>Karat</dt>
                                <dd className="font-medium text-[var(--theme-text)]">{activePlainKarat.label}</dd>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <dt>Chain</dt>
                              <dd className="font-medium text-[var(--theme-text)]">{activePlainChain.label}</dd>
                            </div>
                          </>
                        ) : (
                          <>
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
                          </>
                        )}
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
                  {revisionError && (
                    <div className="mt-4 rounded-2xl border border-sky-400/60 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
                      {revisionError}
                    </div>
                  )}
                  <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {([1, 2] as const).map(variantNum => {
                      const option = generations.find(g => g.kind === "original" && g.variant === variantNum);
                      if (!option) {
                        return (
                          <div
                            key={variantNum}
                            className="relative min-h-[220px] rounded-[32px] border border-white/12 bg-gradient-to-br from-white/5 via-white/10 to-white/5 sm:min-h-[260px]"
                          >
                            <div className={cx("absolute inset-0 animate-pulse bg-gradient-to-br from-slate-800 via-slate-900 to-black", themeRadius.imageOption)} />
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
                            className={cx(
                              "group relative block w-full overflow-hidden transition",
                              themeRadius.resultCard,
                              themeSurface.muted,
                              themeFocusRing,
                              isSelected
                                ? cx(themeBorder.selected, "shadow-[0_0_35px_var(--theme-selected-glow)]")
                                : themeBorder.base
                            )}
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
                          {canCreateRevision && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(option)}
                              className="absolute left-3 top-3 z-10 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm transition hover:bg-black/85"
                              aria-label={`Edit ${option.label}`}
                            >
                              edit
                            </button>
                          )}
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
                    {revisionGenerations.map(option => {
                      const isSelected = selectedGenerationId === option.id;
                      const isPending = option.status === "pending";
                      const isFailed = option.status === "failed";
                      return (
                        <div key={option.id} className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              if (!isPending && !isFailed) setSelectedGenerationId(option.id);
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
                            aria-label={option.label}
                          >
                            {option.src && !isFailed ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={option.src}
                                alt={option.label}
                                className="block h-auto w-full transition duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-sky-950 via-slate-950 to-black" />
                            )}
                            <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                              {option.label}
                            </span>
                            <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-transparent via-transparent to-black/20" aria-hidden />
                            {(isPending || isFailed) && (
                              <span className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-semibold text-white/70">
                                {isPending ? "Creating revision..." : "Revision failed"}
                              </span>
                            )}
                          </button>
                          {!isPending && !isFailed && canCreateRevision && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(option)}
                              className="absolute left-3 top-12 z-10 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm transition hover:bg-black/85"
                              aria-label={`Edit ${option.label}`}
                            >
                              edit
                            </button>
                          )}
                          {!isPending && !isFailed && (
                            <button
                              type="button"
                              onClick={() => setPreviewOption(option)}
                              className="absolute right-3 top-3 z-10 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm transition hover:bg-black/85"
                              aria-label={`Preview ${option.label}`}
                            >
                              view
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-xs text-[var(--theme-text-muted)]">
                    {revisionGenerations.length} of 2 revisions used
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleQuoteRequest}
                    disabled={!selectedGeneration?.src || isGenerating || quoteStatus !== "idle"}
                    className={`flex-1 rounded-2xl px-5 py-3 text-base font-semibold transition ${
                      quoteStatus === "submitted"
                        ? "cursor-default bg-emerald-600 text-white"
                        : selectedGeneration?.src && !isGenerating
                          ? "bg-[var(--theme-accent)] text-[var(--theme-accent-contrast)] hover:bg-[var(--theme-border-hover)]"
                          : "cursor-not-allowed border border-white/15 bg-black/45 text-white/50"
                    }`}
                  >
                    {quoteStatus === "submitting" ? "sending..." : quoteStatus === "submitted" ? "sent" : "get a quote"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVideoError(null);
                      setShowAccessCodePrompt(true);
                    }}
                    disabled={!selectedGeneration?.src || isGenerating}
                    className={`flex-1 rounded-2xl px-5 py-3 text-base font-semibold transition ${selectedGeneration?.src && !isGenerating ? "bg-red-600 text-white hover:bg-red-500" : "cursor-not-allowed border border-white/15 bg-black/45 text-white/50"}`}
                  >
                    Generate Video
                  </button>
                </div>
                {quoteStatus === "submitted" && (
                  <div className="rounded-2xl border border-emerald-400/50 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-50">
                    your Design has been sent! We will reach back soon through email or text
                  </div>
                )}
                {quoteError && (
                  <div className="rounded-2xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {quoteError}
                  </div>
                )}
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

          <footer className="mt-6 flex items-center justify-end">
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
          {step === 1 && !isPlain && emblemWarning && (
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

    {editTarget && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${editTarget.label}`}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      >
        <form
          onSubmit={event => {
            event.preventDefault();
            void handleSubmitRevision();
          }}
          className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#1d120c] shadow-2xl"
        >
          <div className="max-h-[58vh] overflow-hidden bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={editTarget.src}
              alt={`${editTarget.label} selected for editing`}
              className="mx-auto block max-h-[58vh] w-full object-contain"
            />
          </div>
          <div className="space-y-4 p-5">
            <div>
              <h2 className="text-lg font-semibold text-white">Describe the changes</h2>
              <p className="mt-1 text-sm text-white/60">
                You can create {Math.max(0, 2 - revisionGenerations.length)} more revision{2 - revisionGenerations.length === 1 ? "" : "s"} for this design.
              </p>
            </div>
            <label className="block text-sm text-white/70">
              Revision notes
              <textarea
                value={editPrompt}
                onChange={event => {
                  setEditPrompt(event.target.value);
                  setRevisionError(null);
                }}
                autoFocus
                rows={4}
                placeholder="e.g. make the letters thicker and change the butterfly to sit higher"
                className="mt-2 w-full resize-none rounded-2xl border border-white/15 bg-black/45 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-sky-400"
              />
            </label>
            {revisionError && (
              <div className="rounded-2xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {revisionError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditTarget(null);
                  setEditPrompt("");
                  setRevisionError(null);
                }}
                className="flex-1 rounded-2xl border border-white/15 bg-black/45 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/35"
              >
                cancel
              </button>
              <button
                type="submit"
                disabled={!editPrompt.trim() || isRevisionSubmitting}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${editPrompt.trim() && !isRevisionSubmitting ? "bg-sky-500 text-white hover:bg-sky-400" : "cursor-not-allowed border border-white/15 bg-black/45 text-white/50"}`}
              >
                {isRevisionSubmitting ? "creating..." : "create revision"}
              </button>
            </div>
          </div>
        </form>
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
            Enter the internal access code to animate the selected draft.
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
