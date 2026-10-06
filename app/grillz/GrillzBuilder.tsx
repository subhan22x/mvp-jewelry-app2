"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import GrillzToothDiagram from "./GrillzToothDiagram";
import DesignStepHeader from "@/app/components/DesignStepHeader";
import ThemedOptionButton from "@/app/components/ThemedOptionButton";
import LeadCaptureModal from "@/app/name/components/LeadCaptureModal";
import {
  GRILLZ_DIAMOND_QUALITIES,
  GRILLZ_GOLD_COLORS,
  GRILLZ_PRESETS,
  GRILLZ_STONE_TYPES,
  GRILLZ_STYLES,
  type GrillzDiamondQuality,
  type GrillzGoldColor,
  type GrillzStoneType,
  type GrillzStyleId
} from "@/src/lib/grillz/config";
import { cx, panelClass, themeBorder, themeRadius, themeSurface } from "@/src/lib/theme/ui-classes";

// Shared landing-grid card styling, kept in sync with PendantsIndex so every
// design-wizard entry screen renders an identical grid.
const landingCardClass =
  "group relative flex min-h-[208px] flex-col items-center justify-between rounded-[28px] border border-white/15 bg-black/90 p-5 text-center transition hover:border-white/35";

type Screen = "style" | "customize" | "review";
type GenerationStatus = "idle" | "pending" | "succeeded" | "failed";
type LeadContact = { leadId: string; name: string; phone: string; email: string };

const MAX_POLL_ATTEMPTS = 50;
const CUSTOM_GRILLZ_STYLE_ID: GrillzStyleId = "custom_inspiration";

const GOLD_SWATCHES: Record<GrillzGoldColor, string> = {
  yellow_gold: "from-[#ffd06a] via-[#e8a934] to-[#9d5d16]",
  white_gold: "from-[#ffffff] via-[#b8c2ce] to-[#697482]",
  rose_gold: "from-[#f4b294] via-[#c8714f] to-[#78371f]"
};

function DesignFlowShell({
  children,
  screen,
  backHref,
  onBack
}: {
  children: React.ReactNode;
  screen: Screen;
  backHref: string;
  onBack: () => void;
}) {
  const progressStep = screen === "style" ? 0 : screen === "customize" ? 1 : 2;
  return (
    <main className="min-h-dvh px-4 py-4 text-[var(--theme-text)] md:px-8">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col px-4 pb-6 pt-4 sm:px-6 md:px-12">
        <DesignStepHeader current={progressStep} {...(screen === "style" ? { backHref } : { onBack })} />
        {children}
      </div>
    </main>
  );
}

function StyleScreen({
  styleId,
  setStyleId,
  onNext,
  backHref
}: {
  styleId: GrillzStyleId;
  setStyleId: (styleId: GrillzStyleId) => void;
  onNext: () => void;
  backHref: string;
}) {
  return (
    <main className="min-h-dvh px-4 py-5 text-white md:px-8 md:py-10">
      <div className="mx-auto w-full max-w-4xl px-4 pb-14 pt-3 sm:px-6 md:px-12 md:pt-10">
        <DesignStepHeader current={0} backHref={backHref} />

        <header className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-white/70">001</p>
          <h1 className="mt-2 text-[1.95rem] font-bold leading-none tracking-tight md:text-[2.75rem]">Dream it first</h1>
          <p
            className="mt-1 text-[1.45rem] italic leading-none text-white/90 md:mt-2 md:text-3xl"
            style={{ fontFamily: "var(--font-nostalgic)" }}
          >
            we&apos;ll build it.
          </p>
          <p className="mt-3 max-w-lg text-[0.68rem] leading-relaxed text-white/75 md:mt-4 md:text-sm">
            Choose your grillz style and we'll help you design and customize it to your liking
          </p>
        </header>

        <section className="mt-7 grid grid-cols-2 gap-4 sm:gap-6 md:mt-12 md:grid-cols-3">
          {GRILLZ_STYLES.map((style, index) => {
            const isActive = styleId === style.id;
            const className = `${landingCardClass} ${isActive ? "border-[3px] border-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.35)]" : ""}`;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => setStyleId(style.id)}
                aria-pressed={isActive}
                className={className}
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-[22px] bg-black">
                  {style.src ? (
                    <Image
                      src={style.src}
                      alt={style.label}
                      fill
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 18vw"
                      className="object-contain object-center"
                      priority={index === 0}
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center px-4 text-center">
                      <span className="text-5xl font-black text-[#ffc25d]">{style.label.slice(0, 1)}</span>
                      <span className="mt-3 text-[10px] uppercase tracking-wide text-white/55">Upload inspo</span>
                    </div>
                  )}
                </div>
                <span
                  className="mt-4 text-sm font-semibold italic leading-tight tracking-wide text-white"
                  style={{ fontFamily: "var(--font-figtree)" }}
                >
                  {style.label}
                </span>
              </button>
            );
          })}
        </section>

        <button
          type="button"
          onClick={onNext}
          className="mt-8 h-12 w-full rounded-xl bg-[#ffc66c] text-sm font-bold text-black"
        >
          Continue
        </button>
      </div>
    </main>
  );
}

function CustomizeScreen({
  isCustomStyle,
  customInspirationName,
  customInspirationPreviewUrl,
  onCustomInspirationFile,
  selectedTeeth,
  presetId,
  presetsExpanded,
  applyPreset,
  onTogglePresets,
  toggleTooth,
  goldColor,
  setGoldColor,
  stoneType,
  setStoneType,
  onNext
}: {
  isCustomStyle: boolean;
  customInspirationName: string | null;
  customInspirationPreviewUrl: string | null;
  onCustomInspirationFile: (file: File | null) => void;
  selectedTeeth: string[];
  presetId: string | null;
  presetsExpanded: boolean;
  applyPreset: (presetId: string) => void;
  onTogglePresets: () => void;
  toggleTooth: (toothId: string) => void;
  goldColor: GrillzGoldColor;
  setGoldColor: (goldColor: GrillzGoldColor) => void;
  stoneType: GrillzStoneType;
  setStoneType: (stoneType: GrillzStoneType) => void;
  onNext: () => void;
}) {
  const customInputRef = useRef<HTMLInputElement | null>(null);
  const visiblePresets = presetsExpanded ? GRILLZ_PRESETS : GRILLZ_PRESETS.slice(0, 4);
  const canReview = selectedTeeth.length > 0 && (!isCustomStyle || Boolean(customInspirationPreviewUrl));

  return (
    <>
      {isCustomStyle ? (
        <section className={panelClass("mb-7 p-4")}>
          <h2 className="text-xl font-bold text-[var(--theme-text)]">Upload Inspiration</h2>
          <p className="mt-1 text-xs text-[var(--theme-text-soft)]">Add the grillz photo or sketch you want us to follow.</p>
          <button
            type="button"
            onClick={() => customInputRef.current?.click()}
            className={cx("mt-4 flex min-h-[180px] w-full items-center justify-center overflow-hidden border border-dashed p-4 text-center transition hover:border-[color:var(--theme-border-hover)]", themeRadius.imageOption, themeSurface.base)}
          >
            {customInspirationPreviewUrl ? (
              <img src={customInspirationPreviewUrl} alt="Uploaded custom grillz inspiration" className="max-h-[220px] max-w-full rounded-2xl object-contain" />
            ) : (
              <span className="text-sm font-semibold text-[var(--theme-text-soft)]">Tap to upload inspiration</span>
            )}
          </button>
          <input
            ref={customInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Upload custom grillz inspiration"
            onChange={event => onCustomInspirationFile(event.target.files?.[0] ?? null)}
          />
          {customInspirationName ? <p className="mt-2 text-xs text-[var(--theme-text-muted)]">{customInspirationName}</p> : null}
        </section>
      ) : null}

      <section>
        <h1 className="text-2xl font-bold leading-none">Position</h1>
        <p className="mt-2 text-xs italic text-[#d7ad6f]">Select which teeth the grillz should cover</p>
        <div className="mt-3"><GrillzToothDiagram selectedTeeth={selectedTeeth} goldColor={goldColor} toggleTooth={toggleTooth} /></div>

        <div className="mt-3 flex flex-wrap gap-2">
          {visiblePresets.map(option => (
            <ThemedOptionButton
              key={option.id}
              selected={presetId === option.id}
              onClick={() => applyPreset(option.id)}
              size="sm"
              className="h-10 rounded-full px-4 text-xs"
            >
              {option.label}
            </ThemedOptionButton>
          ))}
          <button
            type="button"
            onClick={onTogglePresets}
            aria-label={presetsExpanded ? "Collapse tooth position options" : "Show all tooth position options"}
            className={cx(
              "flex h-10 min-w-12 items-center justify-center rounded-full px-4 text-xl font-semibold leading-none transition",
              themeBorder.base,
              themeSurface.base,
              "text-[var(--theme-text-soft)] hover:border-[color:var(--theme-border-hover)] hover:text-[var(--theme-text)]"
            )}
          >
            {presetsExpanded ? "−" : "+"}
          </button>
        </div>
      </section>

      <section className="mt-7">
        <h2 className="text-2xl font-bold leading-none">Gold Color</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {GRILLZ_GOLD_COLORS.map(option => (
            <ThemedOptionButton
              key={option.id}
              selected={goldColor === option.id}
              onClick={() => setGoldColor(option.id)}
              className="min-h-12"
            >
              <span className="flex items-center justify-center gap-2">
                <span className={cx("h-5 w-5 rounded-full bg-gradient-to-br", GOLD_SWATCHES[option.id])} />
                <span>{option.label}</span>
              </span>
            </ThemedOptionButton>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="text-2xl font-bold leading-none">Stone Type</h2>
        <div className="mt-4 grid grid-cols-1 gap-3">
          {GRILLZ_STONE_TYPES.map(option => (
            <ThemedOptionButton key={option.id} selected={stoneType === option.id} onClick={() => setStoneType(option.id)}>
              {option.label}
            </ThemedOptionButton>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={onNext}
        disabled={!canReview}
        className="mt-7 h-12 w-full rounded-xl bg-[#ffc66c] text-sm font-bold text-black disabled:opacity-45"
      >
        Review
      </button>
    </>
  );
}

function ReviewScreen({
  selectedTeeth,
  goldColor,
  styleLabel,
  stylePreviewUrl,
  diamondQuality,
  generationStatus,
  generationError,
  generatedImageUrl,
  requestId,
  leadContact,
  onGenerate,
  onEdit
}: {
  selectedTeeth: string[];
  goldColor: GrillzGoldColor;
  styleLabel: string;
  stylePreviewUrl: string | null;
  diamondQuality: GrillzDiamondQuality;
  generationStatus: GenerationStatus;
  generationError: string | null;
  generatedImageUrl: string | null;
  requestId: string | null;
  leadContact: LeadContact | null;
  onGenerate: () => void;
  onEdit: () => void;
}) {
  const upperCount = selectedTeeth.filter(id => id.startsWith("U")).length;
  const lowerCount = selectedTeeth.filter(id => id.startsWith("L")).length;

  return (
    <>
      <section>
        <h1 className="text-2xl font-bold leading-none">Diamond Quality</h1>
        <div className="mt-7 flex gap-4">
          {GRILLZ_DIAMOND_QUALITIES.map(option => (
            <ThemedOptionButton
              key={option.id}
              selected={diamondQuality === option.id}
              size="lg"
              minWidthClass="min-w-[72px]"
              uppercase
            >
              {option.label}
            </ThemedOptionButton>
          ))}
        </div>
      </section>

      <section className={panelClass("mt-8 p-5")}>
        <p className="text-sm font-bold">Selected style</p>
        <div className={cx("mt-4 flex aspect-square items-center justify-center overflow-hidden", themeRadius.imageOption, themeSurface.strong)}>
          {stylePreviewUrl ? (
            <img src={stylePreviewUrl} alt={`${styleLabel} style reference`} className="h-full w-full rounded-[1.1rem] object-contain" />
          ) : (
            <span className="px-6 text-center text-sm text-white/35">{styleLabel}</span>
          )}
        </div>
      </section>

      <section className={panelClass("mt-8 p-5")}>
        <p className="text-sm font-bold">{generationStatus === "pending" ? "Drafting your imagination...." : generatedImageUrl ? "Your draft is ready" : "Preview your positioning"}</p>
        <div className={cx("mt-7 flex aspect-square items-center justify-center overflow-hidden", themeRadius.imageOption, themeSurface.strong)}>
          {generatedImageUrl ? (
            <img src={generatedImageUrl} alt="Generated Grillz" className="h-full w-full rounded-[1.1rem] object-contain" />
          ) : (
            <GrillzToothDiagram selectedTeeth={selectedTeeth} goldColor={goldColor} />
          )}
        </div>
        {generatedImageUrl ? (
          <div className="mt-4 rounded-2xl bg-black/30 px-3 pt-3">
            <p className="text-center text-xs font-semibold text-white/70">Selected positioning</p>
            <GrillzToothDiagram selectedTeeth={selectedTeeth} goldColor={goldColor} compact />
          </div>
        ) : null}
        <p className="mt-3 text-center text-sm text-white/65">{upperCount} upper · {lowerCount} lower</p>
        {generationError ? <p className="mt-4 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">{generationError}</p> : null}
        {requestId ? <p className="mt-3 text-xs text-white/35">Request {requestId.slice(0, 8)}</p> : null}
        {leadContact ? <p className="mt-3 text-xs text-emerald-200">Contact saved for {leadContact.name}</p> : null}
        <div className="mt-5 grid grid-cols-2 gap-4">
          <button type="button" onClick={onEdit} className={cx("h-11 rounded-2xl text-sm font-bold", themeBorder.base, themeSurface.base)}>
            edit
          </button>
          {generatedImageUrl ? (
            <a href={generatedImageUrl} download="grillz.png" className={cx("flex h-11 items-center justify-center rounded-2xl text-sm font-bold", themeBorder.base, themeSurface.base)}>
              download
            </a>
          ) : (
            <button
              type="button"
              onClick={onGenerate}
              disabled={generationStatus === "pending"}
              className="h-11 rounded-2xl bg-[var(--theme-accent)] text-sm font-bold text-[var(--theme-accent-contrast)] disabled:opacity-50"
            >
              {generationStatus === "pending" ? "Generating" : "Generate"}
            </button>
          )}
        </div>
      </section>

      {generatedImageUrl ? (
        <button type="button" className="mt-8 h-12 w-full rounded-xl bg-[#ffc66c] text-sm font-bold text-black">
          get a quote
        </button>
      ) : null}
    </>
  );
}

export default function GrillzBuilder({
  backHref = "/design",
  accountSlug
}: {
  backHref?: string;
  accountSlug?: string;
}) {
  const [screen, setScreen] = useState<Screen>("style");
  const [styleId, setStyleId] = useState<GrillzStyleId>("honeycomb_icedout");
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>(GRILLZ_PRESETS[0].toothIds);
  const [presetId, setPresetId] = useState<string | null>(GRILLZ_PRESETS[0].id);
  const [presetsExpanded, setPresetsExpanded] = useState(false);
  const [goldColor, setGoldColor] = useState<GrillzGoldColor>("yellow_gold");
  const [stoneType, setStoneType] = useState<GrillzStoneType>("natural_diamonds");
  const [diamondQuality, setDiamondQuality] = useState<GrillzDiamondQuality>("vvs");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("idle");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadContact, setLeadContact] = useState<LeadContact | null>(null);
  const [customInspirationFile, setCustomInspirationFile] = useState<File | null>(null);
  const [customInspirationPreviewUrl, setCustomInspirationPreviewUrl] = useState<string | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  const selectedStyle = GRILLZ_STYLES.find(style => style.id === styleId) ?? GRILLZ_STYLES[0];
  const stylePreviewUrl = styleId === CUSTOM_GRILLZ_STYLE_ID ? customInspirationPreviewUrl : selectedStyle.src;

  useEffect(() => {
    return () => {
      if (customInspirationPreviewUrl) URL.revokeObjectURL(customInspirationPreviewUrl);
    };
  }, [customInspirationPreviewUrl]);

  useEffect(() => () => pollAbortRef.current?.abort(), []);

  function invalidateDraft() {
    pollAbortRef.current?.abort();
    setGeneratedImageUrl(null);
    setRequestId(null);
    setGenerationStatus("idle");
    setGenerationError(null);
    setLeadContact(null);
    setShowLeadCapture(false);
  }

  function goBack() {
    if (screen === "review") setScreen("customize");
    else if (screen === "customize") setScreen("style");
  }

  function applyPreset(nextPresetId: string) {
    const preset = GRILLZ_PRESETS.find(option => option.id === nextPresetId);
    if (!preset) return;
    if (preset.toothIds.length !== selectedTeeth.length || preset.toothIds.some(id => !selectedTeeth.includes(id))) invalidateDraft();
    setSelectedTeeth(preset.toothIds);
    setPresetId(preset.id);
  }

  function toggleTooth(toothId: string) {
    invalidateDraft();
    setSelectedTeeth(current => {
      const next = current.includes(toothId)
        ? current.filter(id => id !== toothId)
        : [...current, toothId];
      return next.sort((a, b) => a.localeCompare(b));
    });
    setPresetId(null);
  }

  function handleCustomInspirationFile(file: File | null) {
    invalidateDraft();
    if (customInspirationPreviewUrl) URL.revokeObjectURL(customInspirationPreviewUrl);
    setCustomInspirationFile(file);
    setCustomInspirationPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  async function pollGeneration(nextRequestId: string, signal: AbortSignal) {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      if (signal.aborted) return;
      const response = await fetch(`/api/requests/${nextRequestId}`, { cache: "no-store", signal });
      const data = await response.json().catch(() => ({}));
      if (signal.aborted) return;
      if (!response.ok) throw new Error(data.error ?? "Unable to check Grillz generation.");
      const succeeded = data.results?.[0]?.imageUrl;
      if (succeeded) {
        setGeneratedImageUrl(succeeded);
        setGenerationStatus("succeeded");
        return;
      }
      const failedAttempt = data.attempts?.find((item: { status?: string }) => item.status === "failed");
      if (data.done && failedAttempt) {
        throw new Error(failedAttempt.error ?? "Grillz generation failed.");
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error("Grillz generation is taking longer than expected. Check back shortly.");
  }

  async function generateGrillz() {
    if (!selectedTeeth.length || generationStatus === "pending") return;
    pollAbortRef.current?.abort();
    const controller = new AbortController();
    pollAbortRef.current = controller;
    setGenerationStatus("pending");
    setGenerationError(null);
    setGeneratedImageUrl(null);
    setLeadContact(null);

    try {
      const isCustomStyle = styleId === CUSTOM_GRILLZ_STYLE_ID;
      if (isCustomStyle && !customInspirationFile) {
        throw new Error("Upload an inspiration image before generating custom Grillz.");
      }
      const customForm = new FormData();
      if (isCustomStyle) {
        customForm.append("userId", "demo");
        if (accountSlug) customForm.append("accountSlug", accountSlug);
        customForm.append("styleId", styleId);
        customForm.append("selectedTeeth", JSON.stringify(selectedTeeth));
        if (presetId) customForm.append("presetId", presetId);
        customForm.append("goldColor", goldColor);
        customForm.append("stoneType", stoneType);
        customForm.append("diamondQuality", diamondQuality);
        customForm.append("inspiration", `Customer uploaded inspiration image: ${customInspirationFile!.name}`);
        customForm.append("inspirationImage", customInspirationFile!);
      }
      const response = await fetch("/api/grillz-requests", {
        method: "POST",
        ...(isCustomStyle
          ? { body: customForm }
          : {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: "demo",
                accountSlug,
                styleId,
                selectedTeeth,
                presetId,
                goldColor,
                stoneType,
                diamondQuality
              })
            })
      });
      const data = await response.json().catch(() => ({}));
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error(data.error ?? "Unable to start Grillz generation.");
      setRequestId(data.requestId);
      setShowLeadCapture(true);
      await pollGeneration(data.requestId, controller.signal);
    } catch (error) {
      if (controller.signal.aborted) return;
      setGenerationStatus("failed");
      setGenerationError(error instanceof Error ? error.message : "Grillz generation failed.");
    }
  }

  if (screen === "style") {
    return (
      <StyleScreen
        styleId={styleId}
        setStyleId={next => {
          if (next !== styleId) invalidateDraft();
          setStyleId(next);
        }}
        onNext={() => setScreen("customize")}
        backHref={backHref}
      />
    );
  }

  return (
    <>
      <DesignFlowShell screen={screen} backHref={backHref} onBack={goBack}>
        {screen === "customize" ? (
          <CustomizeScreen
            isCustomStyle={styleId === CUSTOM_GRILLZ_STYLE_ID}
            customInspirationName={customInspirationFile?.name ?? null}
            customInspirationPreviewUrl={customInspirationPreviewUrl}
            onCustomInspirationFile={handleCustomInspirationFile}
            selectedTeeth={selectedTeeth}
            presetId={presetId}
            presetsExpanded={presetsExpanded}
            applyPreset={applyPreset}
            onTogglePresets={() => setPresetsExpanded(value => !value)}
            toggleTooth={toggleTooth}
            goldColor={goldColor}
            setGoldColor={next => {
              if (next !== goldColor) invalidateDraft();
              setGoldColor(next);
            }}
            stoneType={stoneType}
            setStoneType={next => {
              if (next !== stoneType) invalidateDraft();
              setStoneType(next);
            }}
            onNext={() => setScreen("review")}
          />
        ) : null}
        {screen === "review" ? (
          <ReviewScreen
            selectedTeeth={selectedTeeth}
            goldColor={goldColor}
            styleLabel={selectedStyle.label}
            stylePreviewUrl={stylePreviewUrl}
            diamondQuality={diamondQuality}
            generationStatus={generationStatus}
            generationError={generationError}
            generatedImageUrl={generatedImageUrl}
            requestId={requestId}
            leadContact={leadContact}
            onGenerate={generateGrillz}
            onEdit={() => setScreen("customize")}
          />
        ) : null}
      </DesignFlowShell>

      {showLeadCapture && (
        <LeadCaptureModal
          requestId={requestId}
          accountSlug={accountSlug}
          onSubmitted={lead => {
            setLeadContact(lead);
            setShowLeadCapture(false);
          }}
        />
      )}
    </>
  );
}
