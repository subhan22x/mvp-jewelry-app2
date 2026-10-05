"use client";

import Link from "next/link";
import { ChangeEvent, ReactNode, useEffect, useRef, useState } from "react";
import DesignProgressBar from "../../components/DesignProgressBar";
import LeadCaptureModal from "@/app/name/components/LeadCaptureModal";
import CustomerResultsScreen, { CustomerResultPreviewDialog, type CustomerDesignResult } from "@/app/components/customer-flow/CustomerResultsScreen";
import CustomerResultEditDialog from "@/app/components/customer-flow/CustomerResultEditDialog";
import { uploadFileDirectly } from "@/src/lib/uploads/direct-r2";
import { LOGO_UPLOAD_MAX_BYTES, LOGO_UPLOAD_TYPES } from "@/src/lib/logo-pendants/config";

type ShapeOption = "custom" | "circle" | "shield" | "hexa" | "diamond";
type ColorCombo = "YELLOW_WHITE" | "ROSE_WHITE" | "WHITE";
type SizeOption = "small" | "medium" | "large" | "xl";
type StoneType = "natural" | "lab" | "moissanite" | "cz";
type DiamondQuality = "vs" | "vvs";
type MetalType = "gold" | "silver" | "platinum";
type LogoResult = CustomerDesignResult & { sourceResultId?: string; revisionNumber?: number };

const SHAPES: Array<{
  id: ShapeOption;
  label: string;
  previewClass: string;
  iconSizeClass: string;
  previewSizeClass: string;
  iconSrc?: string;
}> = [
  {
    id: "custom",
    label: "Custom",
    previewClass: "rounded-[34%_66%_58%_42%/42%_38%_62%_58%]",
    iconSizeClass: "h-16 w-16",
    previewSizeClass: "h-[68%] w-[68%]",
  },
  {
    id: "circle",
    label: "Circle",
    previewClass: "rounded-full",
    iconSizeClass: "h-20 w-20",
    previewSizeClass: "h-[68%] w-[68%]",
    iconSrc: "/logo-pendants/shapes/circle.png",
  },
  {
    id: "shield",
    label: "Shield",
    previewClass: "[clip-path:polygon(50%_0,92%_18%,82%_78%,50%_100%,18%_78%,8%_18%)]",
    iconSizeClass: "h-20 w-20",
    previewSizeClass: "h-[70%] w-[62%]",
    iconSrc: "/logo-pendants/shapes/shield.png",
  },
  {
    id: "hexa",
    label: "Hexa",
    previewClass: "[clip-path:polygon(25%_4%,75%_4%,100%_50%,75%_96%,25%_96%,0_50%)]",
    iconSizeClass: "h-20 w-20",
    previewSizeClass: "h-[68%] w-[68%]",
    iconSrc: "/logo-pendants/shapes/hexa.png",
  },
  {
    id: "diamond",
    label: "Diamond",
    previewClass: "[clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)]",
    iconSizeClass: "h-20 w-20",
    previewSizeClass: "h-[66%] w-[66%]",
    iconSrc: "/logo-pendants/shapes/diamond.png",
  },
];

const COLOR_COMBOS: Array<{ id: ColorCombo; label: string; summary: string; swatch: string }> = [
  { id: "YELLOW_WHITE", label: "Yellow + White Gold", summary: "Yellow gold + White gold", swatch: "from-[#f8cf61] via-[#f6c456] to-[#e9edf2]" },
  { id: "ROSE_WHITE", label: "Rose + White Gold", summary: "Rose gold + White gold", swatch: "from-[#e3a07e] via-[#d88b6d] to-[#eef1f5]" },
  { id: "WHITE", label: "White Gold", summary: "White gold", swatch: "from-[#fbfdff] via-[#dce4ee] to-[#aeb9c7]" },
];

const SIZES: Array<{ id: SizeOption; label: string }> = [
  { id: "small", label: "Small" },
  { id: "medium", label: "Medium" },
  { id: "large", label: "Large" },
  { id: "xl", label: "XL" },
];

const STONES: Array<{ id: StoneType; label: string }> = [
  { id: "natural", label: "Natural Diamonds" },
  { id: "lab", label: "Lab Diamonds" },
  { id: "moissanite", label: "Moissanite" },
  { id: "cz", label: "CZ" },
];

const METALS: Array<{ id: MetalType; label: string }> = [
  { id: "gold", label: "Gold" },
  { id: "silver", label: "Silver" },
  { id: "platinum", label: "Platinum" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function optionLabel<T extends string>(options: Array<{ id: T; label: string }>, id: T) {
  return options.find(option => option.id === id)?.label ?? id;
}

function StepButton({
  selected,
  children,
  onClick,
  className = "",
}: {
  selected: boolean;
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "min-h-14 rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition",
        selected
          ? "border-[var(--theme-selected-border)] bg-[var(--theme-selected-surface)] text-[var(--theme-heading)] shadow-[0_0_22px_var(--theme-selected-glow)]"
          : "border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] hover:border-[var(--theme-border-hover)]",
        className
      )}
    >
      {children}
    </button>
  );
}

export default function LogoPendantBuilder({ basePath, accountSlug }: { basePath?: string; accountSlug?: string } = {}) {
  const [step, setStep] = useState(0);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [shape, setShape] = useState<ShapeOption>("custom");
  const [colorCombo, setColorCombo] = useState<ColorCombo>("YELLOW_WHITE");
  const [includeInfo, setIncludeInfo] = useState(true);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [size, setSize] = useState<SizeOption>("medium");
  const [stoneType, setStoneType] = useState<StoneType>("natural");
  const [diamondQuality, setDiamondQuality] = useState<DiamondQuality>("vvs");
  const [metalType, setMetalType] = useState<MetalType>("gold");
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [originalResults, setOriginalResults] = useState<LogoResult[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<CustomerDesignResult | null>(null);
  const [revisions, setRevisions] = useState<LogoResult[]>([]);
  const [editTarget, setEditTarget] = useState<LogoResult | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [isRevisionSubmitting, setIsRevisionSubmitting] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revisionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationEpochRef = useRef(0);

  useEffect(() => () => {
    generationEpochRef.current += 1;
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    if (revisionTimeoutRef.current) clearTimeout(revisionTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile]);

  const activeShape = SHAPES.find(option => option.id === shape) ?? SHAPES[0];
  const activeColor = COLOR_COMBOS.find(option => option.id === colorCombo) ?? COLOR_COMBOS[0];
  const results: LogoResult[] = [
    ...originalResults,
    ...revisions
  ];
  const canCreateRevision = revisions.length < 2 && !isRevisionSubmitting;

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setError(null);
    if (file && (!(LOGO_UPLOAD_TYPES as readonly string[]).includes(file.type) || file.size === 0 || file.size > LOGO_UPLOAD_MAX_BYTES)) {
      setLogoFile(null);
      setError("Choose a supported logo image, 10MB or smaller.");
      return;
    }
    setLogoFile(file);
  }

  function handleBack() {
    if (step === 0) return;
    generationEpochRef.current += 1;
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    if (revisionTimeoutRef.current) clearTimeout(revisionTimeoutRef.current);
    pollTimeoutRef.current = null;
    setIsGenerating(false);
    setIsRevisionSubmitting(false);
    setEditTarget(null);
    setPreviewResult(null);
    setShowLeadCapture(false);
    setError(null);
    setStep(step === 2 ? 1 : 0);
  }

  async function handleGenerate() {
    if (isGenerating || isRevisionSubmitting || !logoFile) return;
    setError(null);
    setOriginalResults([]);
    setSelectedResultId(null);
    setRevisions([]);
    setRevisionError(null);
    setPreviewResult(null);
    setEditTarget(null);
    setRequestId(null);
    setIsGenerating(true);
    const epoch = ++generationEpochRef.current;
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    try {
      const settings = {
        userId: "demo", accountSlug, shape, colorCombo,
        additionalText: includeInfo ? additionalInfo.trim() : "",
        size, stoneType, diamondQuality, metalType
      };
      const imageUpload = await uploadFileDirectly(logoFile, "logo-pendant");
      if (epoch !== generationEpochRef.current) return;
      const form = new FormData();
      Object.entries(settings).forEach(([key, value]) => {
        if (value !== undefined) form.set(key, value);
      });
      form.set("image", logoFile);
      const response = await fetch("/api/logo-requests", {
        method: "POST",
        ...(imageUpload ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...settings, imageUpload }) } : { body: form })
      });
      const data = await response.json().catch(() => ({}));
      if (epoch !== generationEpochRef.current) return;
      if (!response.ok) throw new Error(data.error ?? "Unable to start logo pendant generation.");
      if (typeof data.requestId !== "string") throw new Error("Unable to start logo pendant generation.");
      const currentRequestId: string = data.requestId;
      setRequestId(currentRequestId);
      setStep(2);
      setShowLeadCapture(true);
      let pollCount = 0;
      const poll = async () => {
        if (epoch !== generationEpochRef.current) return;
        pollCount += 1;
        try {
          const pollResponse = await fetch(`/api/requests/${currentRequestId}`);
          const pollData = await pollResponse.json();
          if (epoch !== generationEpochRef.current) return;
          if (!pollResponse.ok) throw new Error("Unable to load logo pendant results.");
          const successful = pollData.results ?? [];
          const attempts = pollData.attempts ?? successful.map((result: { id: string; variant: number; imageUrl: string }) => ({ ...result, status: "succeeded" }));
          setOriginalResults(attempts.map((attempt: { id: string; variant: number; imageUrl?: string; status: "pending" | "succeeded" | "failed" }) => ({
            id: attempt.id,
            label: `Logo pendant draft ${attempt.variant}`,
            src: attempt.imageUrl,
            status: attempt.status
          })));
          if (pollData.done) {
            setIsGenerating(false);
            pollTimeoutRef.current = null;
            if (!successful.length) {
              const failed = pollData.attempts?.find((attempt: { status: string; error?: string }) => attempt.status === "failed");
              setError(failed?.error ?? "No logo pendant image was generated. Please try again.");
            }
            return;
          }
        } catch {
          // Retry transient polling errors within the same generation attempt.
        }
        if (epoch !== generationEpochRef.current) return;
        if (pollCount >= 150) {
          setIsGenerating(false);
          pollTimeoutRef.current = null;
          setError("Logo pendant generation timed out. Please try again.");
          return;
        }
        pollTimeoutRef.current = setTimeout(poll, 2000);
      };
      void poll();
    } catch (generationError) {
      if (epoch !== generationEpochRef.current) return;
      setError(generationError instanceof Error ? generationError.message : "Unable to generate your logo pendant.");
      setIsGenerating(false);
    }
  }

  async function handleSubmitRevision() {
    if (!requestId || !editTarget || !editPrompt.trim() || !canCreateRevision) return;
    const epoch = generationEpochRef.current;
    const revisionNumber = revisions.length + 1;
    const placeholderId = `pending-revision-${revisionNumber}`;
    const sourceResultId = editTarget.sourceResultId ?? editTarget.id;
    const prompt = editPrompt.trim();
    setRevisionError(null);
    setIsRevisionSubmitting(true);
    setRevisions(previous => [...previous, { id: placeholderId, label: `Rev ${revisionNumber}`, badgeLabel: `Rev ${revisionNumber}`, status: "pending", sourceResultId, revisionNumber }]);
    setEditTarget(null);
    setEditPrompt("");
    try {
      const response = await fetch(`/api/requests/${requestId}/revisions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceResultId, prompt }) });
      const data = await response.json().catch(() => ({}));
      if (epoch !== generationEpochRef.current) return;
      if (!response.ok) throw new Error(data.error ?? "Failed to start revision.");
      if (typeof data.revisionId !== "string") throw new Error("Failed to start revision.");
      const revisionId: string = data.revisionId;
      setRevisions(previous => previous.map(result => result.id === placeholderId ? { ...result, id: revisionId } : result));
      let pollCount = 0;
      const poll = async () => {
        if (epoch !== generationEpochRef.current) return;
        pollCount += 1;
        try {
          const pollResponse = await fetch(`/api/requests/${requestId}/revisions/${revisionId}`);
          const revision = await pollResponse.json();
          if (epoch !== generationEpochRef.current) return;
          if (!pollResponse.ok) throw new Error(revision.error ?? "Failed to check revision.");
          if (revision.done) {
            const succeeded = revision.status === "succeeded" && Boolean(revision.imageUrl);
            setRevisions(previous => previous.map(result => result.id === revisionId ? { ...result, status: succeeded ? "succeeded" : "failed", src: succeeded ? revision.imageUrl : null } : result));
            if (succeeded) setSelectedResultId(revisionId);
            else setRevisionError(revision.error ?? "Revision did not complete. Please try again.");
            setIsRevisionSubmitting(false);
            revisionTimeoutRef.current = null;
            return;
          }
        } catch {
          // Retry transient polling errors until the attempt finishes or times out.
        }
        if (epoch !== generationEpochRef.current) return;
        if (pollCount >= 150) {
          setRevisions(previous => previous.map(result => result.id === revisionId ? { ...result, status: "failed" } : result));
          setRevisionError("Revision did not complete. Please try again.");
          setIsRevisionSubmitting(false);
          revisionTimeoutRef.current = null;
          return;
        }
        revisionTimeoutRef.current = setTimeout(poll, 2000);
      };
      void poll();
    } catch (revisionFailure) {
      if (epoch !== generationEpochRef.current) return;
      setRevisions(previous => previous.filter(result => result.id !== placeholderId));
      setRevisionError(revisionFailure instanceof Error ? revisionFailure.message : "Failed to start revision.");
      setIsRevisionSubmitting(false);
    }
  }

  // Loading/contact and results are separate screens; generation keeps polling while contact is captured.
  if (showLeadCapture) {
    return <LeadCaptureModal requestId={requestId} accountSlug={accountSlug} onSubmitted={() => setShowLeadCapture(false)} />;
  }

  return (
    <main className="min-h-dvh px-4 py-4 text-[var(--theme-text)] md:px-8">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col px-4 pb-8 pt-4 sm:px-6 md:px-12">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
          <div className="mb-8 grid min-h-10 grid-cols-[2.5rem_1fr_2.5rem] items-center gap-3">
            {step === 0 ? (
              <Link
                href={basePath ? `${basePath}/pendants` : "/pendants"}
                aria-label="Back"
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface-muted)] text-xl leading-none text-[var(--theme-text)] transition hover:border-[color:var(--theme-border-hover)]"
              >
                ←
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleBack}
                aria-label="Back"
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface-muted)] text-xl leading-none text-[var(--theme-text)] transition hover:border-[color:var(--theme-border-hover)]"
              >
                ←
              </button>
            )}
            <DesignProgressBar current={step === 0 ? 1 : step === 1 ? 2 : 3} className="justify-self-center" />
            <span aria-hidden="true" />
          </div>

          <header>
            {step !== 2 && <p className="text-xs uppercase tracking-[0.35em] text-[var(--theme-text-soft)]">Logo pendant</p>}
            <h1 className={`${step === 2 ? "" : "mt-2 "}text-[2.15rem] font-semibold tracking-tight text-[var(--theme-heading)] md:text-[2.5rem]`}>{step === 2 ? "Dream it first" : "Build from your mark"}</h1>
            <p
              className="-mt-1 text-[1.7rem] italic text-[var(--theme-script)]"
              style={{ fontFamily: "var(--font-nostalgic)" }}
            >
              {step === 2 ? "we'll build it." : "ice it your way."}
            </p>
          </header>

          <section className="mt-6 flex-1">
            {error && step !== 2 && <p role="alert" className="mb-4 rounded-2xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
            {step === 0 ? (
              <div className="space-y-7">
                <div className="rounded-[28px] border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface-muted)] p-4">
                  <label className="block">
                    <span className="text-lg font-semibold text-[var(--theme-heading)]">Attach logo image</span>
                    <span className="mt-1 block text-sm text-[var(--theme-text-soft)]">Upload the logo or artwork the pendant should be based on.</span>
                    <input className="sr-only" type="file" aria-label="Upload logo image" accept={LOGO_UPLOAD_TYPES.join(",")} onChange={handleLogoChange} />
                    <span className="mt-4 flex min-h-[150px] cursor-pointer items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-[color:var(--theme-border)] bg-[var(--theme-surface)] text-center transition hover:border-[color:var(--theme-border-hover)]">
                      {logoPreviewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoPreviewUrl} alt="Uploaded logo preview" className="h-full max-h-[220px] w-full object-contain p-4" />
                      ) : (
                        <span className="px-6 text-sm font-semibold text-[var(--theme-text-soft)]">Tap to upload logo image</span>
                      )}
                    </span>
                  </label>
                </div>

                <div>
                  <h2 className="text-lg font-semibold">Choose shape</h2>
                  <p className="mt-1 text-sm text-[var(--theme-text-soft)]">Pick the silhouette that best fits the uploaded logo.</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-5">
                    {SHAPES.map(option => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setShape(option.id)}
                        aria-pressed={shape === option.id}
                        className="group flex w-[calc(50%-0.625rem)] min-w-[128px] sm:w-[30%]"
                      >
                        <span
                          className={cx(
                            "relative flex h-32 w-full flex-col items-center justify-center gap-3 rounded-[28px] border transition",
                            shape === option.id
                              ? "border-[var(--theme-selected-border)] bg-[var(--theme-selected-surface)] shadow-[0_18px_38px_rgba(0,0,0,0.3),0_0_24px_var(--theme-selected-glow)]"
                              : "border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-[0_14px_30px_rgba(0,0,0,0.22)] group-hover:border-[var(--theme-border-hover)] group-hover:bg-[var(--theme-surface-muted)]"
                          )}
                        >
                          {option.iconSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={option.iconSrc}
                              alt=""
                              className={cx("object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.35)] saturate-150 transition group-hover:scale-105", option.iconSizeClass)}
                              aria-hidden
                            />
                          ) : (
                            <span
                              className={cx(
                                "block bg-gradient-to-br from-[#fff2a8] via-[#d49b2d] to-[#7a4712] shadow-[inset_0_1px_3px_rgba(255,255,255,0.9),0_12px_22px_rgba(0,0,0,0.28)] transition group-hover:scale-105",
                                option.previewClass,
                                option.iconSizeClass
                              )}
                              aria-hidden
                            />
                          )}
                          {shape === option.id && (
                            <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-[var(--theme-script)] shadow-[0_0_12px_var(--theme-selected-glow)]" aria-hidden />
                          )}
                          <span className="text-sm font-semibold text-[var(--theme-text)]">{option.label}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold">Select Color Combo</h2>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {COLOR_COMBOS.map(option => (
                      <StepButton key={option.id} selected={colorCombo === option.id} onClick={() => setColorCombo(option.id)} className="text-left">
                        <span className="flex items-center gap-3">
                          <span className={cx("h-8 w-8 shrink-0 rounded-full bg-gradient-to-br shadow-inner shadow-white/40", option.swatch)} aria-hidden />
                          <span>{option.label}</span>
                        </span>
                      </StepButton>
                    ))}
                  </div>
                </div>

                <div className="!mt-10 border-t border-white/15 pt-8 sm:!mt-12 sm:pt-10">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="flex items-center gap-2 text-lg font-semibold">
                        Additional info
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-[var(--theme-accent)]">
                          <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" />
                          <path d="M20 2v4m-2-2h4M3 18v4m-2-2h4" />
                        </svg>
                      </h2>
                      <p className="text-sm text-[var(--theme-text-soft)]">Explain what your brand represents to help guide the design.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIncludeInfo(value => !value)}
                      className={cx(
                        "relative h-8 w-14 rounded-full border-2 border-[color:var(--theme-border)] transition",
                        includeInfo ? "bg-[var(--theme-accent)]" : "bg-[var(--theme-surface)]"
                      )}
                      aria-pressed={includeInfo}
                      aria-label="Toggle additional info"
                    >
                      <span className={cx("absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white transition", includeInfo ? "left-7" : "left-1")} />
                    </button>
                  </div>
                  {includeInfo && (
                    <textarea
                      aria-label="Additional info"
                      maxLength={2000}
                      value={additionalInfo}
                      onChange={event => setAdditionalInfo(event.target.value)}
                      placeholder="example: We are a Trucking company helping customers move inventory..."
                      rows={4}
                      className="mt-4 w-full resize-y rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-base outline-none transition placeholder:text-[var(--theme-text-muted)] focus:border-[color:var(--theme-border-hover)]"
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={!logoFile}
                  className="w-full rounded-2xl bg-[var(--theme-accent)] px-5 py-3 text-base font-semibold text-[var(--theme-accent-contrast)] transition hover:bg-[var(--theme-border-hover)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Continue
                </button>
              </div>
            ) : step === 1 ? (
              <div className="space-y-7">
                <div>
                  <h2 className="text-lg font-semibold">Choose size</h2>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {SIZES.map(option => (
                      <StepButton key={option.id} selected={size === option.id} onClick={() => setSize(option.id)}>
                        {option.label}
                      </StepButton>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold">Stone type</h2>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {STONES.map(option => (
                      <StepButton key={option.id} selected={stoneType === option.id} onClick={() => setStoneType(option.id)}>
                        {option.label}
                      </StepButton>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold">Diamond quality</h2>
                  <div className="mt-4 flex gap-3">
                    {(["vs", "vvs"] as const).map(option => (
                      <StepButton key={option} selected={diamondQuality === option} onClick={() => setDiamondQuality(option)} className="min-w-[88px] uppercase">
                        {option}
                      </StepButton>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold">Metal type</h2>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {METALS.map(option => (
                      <StepButton key={option.id} selected={metalType === option.id} onClick={() => setMetalType(option.id)}>
                        {option.label}
                      </StepButton>
                    ))}
                  </div>
                </div>

                <section className="pt-2">
                  <h2 className="text-sm uppercase tracking-[0.35em] text-[var(--theme-text-soft)]">Preview</h2>
                  <div className="mt-4 rounded-[32px] border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface-muted)] p-4">
                    <div className="relative mx-auto flex aspect-square w-full max-w-[360px] items-center justify-center overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top,#2b241c,#080808_66%)]">
                      <div className={cx("relative flex items-center justify-center overflow-hidden border-4 border-white/70 bg-black/55 shadow-[0_0_34px_rgba(255,255,255,0.32)]", activeShape.previewClass, activeShape.previewSizeClass)}>
                        {logoPreviewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoPreviewUrl} alt="Logo pendant preview" className="h-full w-full object-contain p-5" />
                        ) : (
                          <span className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Logo</span>
                        )}
                      </div>

                    </div>
                    {includeInfo && additionalInfo.trim() && (
                      <div className="mt-4 text-sm">
                        <p className="font-semibold">Additional info</p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-[var(--theme-text-soft)]">{additionalInfo.trim()}</p>
                      </div>
                    )}
                    <dl className="mt-4 grid gap-2 text-sm text-[var(--theme-text-soft)] sm:grid-cols-2">
                      <div className="flex justify-between gap-4">
                        <dt>Shape</dt>
                        <dd className="font-medium text-[var(--theme-text)]">{activeShape.label}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt>Color</dt>
                        <dd className="font-medium text-[var(--theme-text)]">{activeColor.summary}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt>Size</dt>
                        <dd className="font-medium text-[var(--theme-text)]">{optionLabel(SIZES, size)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt>Stone</dt>
                        <dd className="font-medium text-[var(--theme-text)]">{optionLabel(STONES, stoneType)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt>Diamond</dt>
                        <dd className="font-medium uppercase text-[var(--theme-text)]">{diamondQuality}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt>Metal</dt>
                        <dd className="font-medium text-[var(--theme-text)]">{optionLabel(METALS, metalType)}</dd>
                      </div>
                    </dl>
                  </div>
                </section>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex-1 rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] px-5 py-3 text-base font-medium transition hover:border-[color:var(--theme-border-hover)]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating || !logoFile}
                    className="flex-1 rounded-2xl bg-[var(--theme-accent)] px-5 py-3 text-base font-semibold text-[var(--theme-accent-contrast)] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isGenerating ? "Submitting..." : "Generate"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <CustomerResultsScreen
                  results={results}
                  expectedCount={Math.max(2, results.length)}
                  selectedResultId={selectedResultId}
                  isGenerating={isGenerating}
                  generationCountLabel={isGenerating ? `${originalResults.filter(result => result.status === "succeeded").length} of 2 generated` : undefined}
                  errors={[error, revisionError]}
                  usageLabel={`${revisions.length} of 2 revisions used`}
                  canEdit={canCreateRevision}
                  onSelect={setSelectedResultId}
                  onPreview={setPreviewResult}
                  onEdit={result => {
                    const target = results.find(option => option.id === result.id);
                    if (target) { setEditTarget(target); setEditPrompt(""); setRevisionError(null); }
                  }}
                />
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={handleBack} className="rounded-2xl border-2 border-[color:var(--theme-border)] px-5 py-3">Edit design</button>
                  {!isGenerating && <button type="button" onClick={handleBack} className="rounded-2xl bg-[var(--theme-accent)] px-5 py-3 font-semibold text-[var(--theme-accent-contrast)]">back</button>}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      {previewResult && <CustomerResultPreviewDialog result={previewResult} onClose={() => setPreviewResult(null)} />}
      {editTarget && <CustomerResultEditDialog result={editTarget} prompt={editPrompt} remaining={2 - revisions.length} submitting={isRevisionSubmitting} error={revisionError} onPromptChange={value => { setEditPrompt(value); setRevisionError(null); }} onClose={() => { setEditTarget(null); setEditPrompt(""); setRevisionError(null); }} onSubmit={() => void handleSubmitRevision()} />}
    </main>
  );
}
