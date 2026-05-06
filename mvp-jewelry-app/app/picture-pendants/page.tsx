"use client";

import { DragEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LeadCaptureModal from "../name/components/LeadCaptureModal";
import { picturePendantStyles, type PicturePendantStyle } from "@/lib/assets";

type Step = 0 | 1 | 2;
type GoldColor = "yellow_gold" | "white_gold" | "rose_gold";
type LeadContact = { leadId: string; name: string; phone: string; email: string };

type GenerationOption = { id: string; label: string; src: string; variant: number };
type GenerationAttempt = {
  variant: number;
  status: "pending" | "succeeded" | "failed";
  error?: string | null;
};

const STEP_LABELS: readonly string[] = ["Image", "Review", "Result"];
const MAX_POLL_ATTEMPTS = 50;

const GOLD_COLORS: ReadonlyArray<{ id: GoldColor; label: string; summary: string }> = [
  { id: "yellow_gold", label: "Yellow Gold", summary: "Yellow gold" },
  { id: "white_gold", label: "White Gold", summary: "White gold" },
  { id: "rose_gold", label: "Rose Gold", summary: "Rose gold" }
];

const buildStyleColumns = (styles: readonly PicturePendantStyle[], perColumn = 2) =>
  styles.reduce<PicturePendantStyle[][]>((columns, style, index) => {
    if (index % perColumn === 0) {
      columns.push([style]);
    } else {
      const last = columns.at(-1);
      if (last) last.push(style);
    }
    return columns;
  }, []);

export default function PicturePendantsBuilder() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const generationEpochRef = useRef(0);

  const availableStyles = picturePendantStyles.filter(style => style.available);
  const [step, setStep] = useState<Step>(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [styleId, setStyleId] = useState<string>(availableStyles[0]?.id ?? "");
  const [goldColor, setGoldColor] = useState<GoldColor>("yellow_gold");
  const [generation, setGeneration] = useState<GenerationOption | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewOption, setPreviewOption] = useState<GenerationOption | null>(null);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [capturedRequestId, setCapturedRequestId] = useState<string | null>(null);
  const [leadContact, setLeadContact] = useState<LeadContact | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<"idle" | "submitting" | "submitted">("idle");
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const styleColumns = buildStyleColumns(picturePendantStyles);
  const activeStyle = availableStyles.find(style => style.id === styleId) ?? null;
  const activeGoldColor = GOLD_COLORS.find(option => option.id === goldColor) ?? GOLD_COLORS[0];
  const canContinueFromImage = Boolean(imageFile && activeStyle);
  const showFooterNext = step === 0;

  useEffect(() => {
    if (!imageFile || typeof URL.createObjectURL !== "function") {
      setPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [imageFile]);

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, []);

  const setSelectedFile = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      setImageFile(null);
      return;
    }

    setUploadError(null);
    setImageFile(file);
    setGeneration(null);
    setGenerationError(null);
    setCapturedRequestId(null);
    setLeadContact(null);
    setQuoteStatus("idle");
    setQuoteError(null);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setSelectedFile(event.dataTransfer.files?.[0]);
  };

  const cancelPolling = () => {
    generationEpochRef.current += 1;
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setIsGenerating(false);
  };

  const confirmDiscardGeneration = () =>
    !generation ||
    window.confirm("Going back will discard your generated picture pendant. Continue?");

  const handleBack = () => {
    if (step === 2 && !confirmDiscardGeneration()) return;
    if (step === 0) {
      router.push("/");
      return;
    }
    if (step === 2) {
      cancelPolling();
      setGeneration(null);
      setShowLeadCapture(false);
      setQuoteStatus("idle");
      setQuoteError(null);
    }
    setStep(prev => ((prev - 1) as Step));
  };

  const handleNext = () => {
    if (!canContinueFromImage) return;
    setStep(1);
  };

  const handleGenerate = async () => {
    if (isGenerating || !imageFile || !activeStyle) return;

    const form = new FormData();
    form.append("userId", "demo");
    form.append("styleId", activeStyle.id);
    form.append("primaryMetal", goldColor);
    form.append("image", imageFile);

    setGeneration(null);
    setGenerationError(null);
    setQuoteStatus("idle");
    setQuoteError(null);
    setIsGenerating(true);

    const epoch = ++generationEpochRef.current;

    try {
      const response = await fetch("/api/picture-requests", {
        method: "POST",
        body: form
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Failed to start picture pendant generation.");
      if (epoch !== generationEpochRef.current) return;

      const requestId: string = data.requestId;
      setCapturedRequestId(requestId);
      setShowLeadCapture(true);
      setStep(2);

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
          const firstResult = results[0];

          if (firstResult) {
            setGeneration({
              id: `picture-${firstResult.variant}`,
              label: "Picture pendant draft",
              src: firstResult.imageUrl,
              variant: firstResult.variant
            });
          }

          if (pollData.done || pollCount >= MAX_POLL_ATTEMPTS) {
            pollTimeoutRef.current = null;
            setIsGenerating(false);
            const failedAttempt = attempts.find(attempt => attempt.status === "failed");
            if (!pollData.done && pollCount >= MAX_POLL_ATTEMPTS) {
              setGenerationError("Picture pendant generation timed out. Please go back and try again.");
            } else if (failedAttempt && !firstResult) {
              setGenerationError(failedAttempt.error ?? "No picture pendant image was generated. Please go back and try again.");
            }
            return;
          }
        } catch {
          // Keep polling through transient errors.
        }

        pollTimeoutRef.current = setTimeout(poll, 2000);
      };

      void poll();
    } catch (error) {
      if (epoch !== generationEpochRef.current) return;
      console.error(error);
      setGenerationError(error instanceof Error ? error.message : "Something went wrong.");
      setIsGenerating(false);
    }
  };

  const handleQuoteRequest = async () => {
    if (!generation || quoteStatus === "submitting" || quoteStatus === "submitted") return;
    if (!capturedRequestId) {
      setQuoteError("Missing request id for this generation.");
      return;
    }
    if (!leadContact) {
      setQuoteError("Please enter your contact information before requesting a quote.");
      setShowLeadCapture(true);
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
          designedImageUrl: generation.src,
          customerName: leadContact.name,
          customerPhone: leadContact.phone,
          customerEmail: leadContact.email
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

  return (
    <>
      <main className="min-h-dvh px-4 py-4 text-white md:px-8">
        <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col px-4 pb-6 pt-4 sm:px-6 md:px-12">
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
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-[2.25rem]">Picture Pendants</h1>
              <p
                className="mt-1 text-2xl italic text-white/90"
                style={{ fontFamily: "var(--font-nostalgic)" }}
              >
                your photo, iced out.
              </p>
            </header>

            <section className="mt-4 flex-1">
              {step === 0 && (
                <div className="space-y-7">
                  <div>
                    <h2 className="text-lg font-semibold">Upload Image</h2>
                    <p className="mt-1 text-sm text-white/60">Drag a photo here or select one from your device.</p>
                    <button
                      type="button"
                      onDragOver={event => event.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4 flex min-h-[220px] w-full flex-col items-center justify-center overflow-hidden rounded-[32px] border border-dashed border-[#C5934F]/70 bg-black/40 p-4 text-center transition hover:border-[#E3A86A]"
                    >
                      {previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewUrl} alt="Uploaded picture preview" className="max-h-[300px] max-w-full rounded-2xl object-contain" />
                      ) : (
                        <span className="text-sm text-white/65">
                          Drop your picture here, or click to select an image.
                        </span>
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      aria-label="Select picture pendant image"
                      className="sr-only"
                      onChange={event => setSelectedFile(event.target.files?.[0])}
                    />
                    {imageFile && (
                      <p className="mt-2 text-xs text-white/50">{imageFile.name}</p>
                    )}
                    {uploadError && (
                      <div className="mt-3 rounded-2xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {uploadError}
                      </div>
                    )}
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold">Choose Picture Style</h2>
                    <p className="mt-1 text-sm text-white/60">Picture Pendant styles are separate from Name styles.</p>

                    {picturePendantStyles.length === 0 ? (
                      <div className="mt-4 rounded-3xl border border-[#71451F]/60 bg-black/35 p-6 text-sm text-white/65">
                        Picture Pendant styles are not configured yet. Add explicit style assets and prompts to enable generation.
                      </div>
                    ) : (
                      <div className="mt-4 -mx-0.5 overflow-x-auto pb-2">
                        <div className="flex snap-x snap-mandatory gap-1.5 px-0">
                          {styleColumns.map((column, columnIndex) => (
                            <div key={columnIndex} className="grid min-w-[192px] grid-rows-2 gap-3 snap-start">
                              {column.map(style => {
                                const isAvailable = style.available === true;
                                const isActive = isAvailable && style.id === styleId;
                                return (
                                  <button
                                    key={style.id}
                                    type="button"
                                    onClick={() => { if (isAvailable) setStyleId(style.id); }}
                                    disabled={!isAvailable}
                                    aria-pressed={isActive}
                                    className={`group relative h-[184px] w-[184px] overflow-hidden rounded-[30px] bg-black/40 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${isActive ? "border-[4px] border-[#C5934F] shadow-[0_18px_36px_rgba(113,69,31,0.45)]" : "border border-[#71451F]"} ${isAvailable ? "hover:border-[#986035]" : "cursor-not-allowed opacity-45"}`}
                                    aria-label={`${style.label} picture pendant style`}
                                  >
                                    {style.src ? (
                                      <Image
                                        src={style.src}
                                        alt={`${style.label} picture pendant style`}
                                        fill
                                        sizes="(max-width: 640px) 210px, 260px"
                                        className="object-cover object-center transition duration-500 group-hover:scale-105"
                                      />
                                    ) : (
                                      <span className="flex h-full items-center justify-center px-4 text-sm text-white/50">{style.label}</span>
                                    )}
                                    <span className="pointer-events-none absolute inset-0 rounded-[30px] border border-[#71451F]/60 bg-gradient-to-b from-transparent via-transparent to-black/35" aria-hidden />
                                    {!isAvailable && (
                                      <span className="absolute bottom-3 left-3 right-3 rounded-full bg-black/70 px-2 py-1 text-[10px] uppercase tracking-wide text-white/70">
                                        prompt needed
                                      </span>
                                    )}
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
                    )}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-semibold text-center">Select Gold Color</h2>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {GOLD_COLORS.map(option => {
                        const isActive = goldColor === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setGoldColor(option.id)}
                            aria-pressed={isActive}
                            className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${isActive ? "border-[3px] border-blue-400 bg-blue-500/20 text-white" : "border-[#71451F] bg-black/45 text-white/80 hover:border-[#986035]"}`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm uppercase tracking-[0.35em] text-white/60">Review your picture pendant</h3>
                    <div className="mt-4 rounded-3xl border border-[#71451F]/60 bg-black/50 p-4">
                      <div className="relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-2xl bg-black/70">
                        {previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={previewUrl} alt="Uploaded picture preview" className="h-full w-full object-contain" />
                        ) : (
                          <span className="text-sm text-white/40">No image selected</span>
                        )}
                      </div>
                      <dl className="mt-4 space-y-2 text-sm text-white/60">
                        <div className="flex justify-between gap-3">
                          <dt>Image</dt>
                          <dd className="truncate font-medium text-white/90">{imageFile?.name ?? "No image selected"}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt>Style</dt>
                          <dd className="font-medium text-white/90">{activeStyle?.label ?? "No style selected"}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt>Gold</dt>
                          <dd className="font-medium text-white/90">{activeGoldColor.summary}</dd>
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
                        onClick={handleGenerate}
                        disabled={isGenerating || !imageFile || !activeStyle}
                        className={`flex-1 rounded-2xl px-5 py-3 text-base font-semibold transition ${isGenerating || !imageFile || !activeStyle ? "cursor-not-allowed border border-white/15 bg-black/45 text-white/50" : "bg-blue-500 text-white hover:bg-blue-400"}`}
                      >
                        {isGenerating ? "submitting..." : "generate"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <div className="rounded-3xl border border-[#71451F]/60 bg-black/35 px-6 py-6">
                    <h2 className="text-lg font-semibold text-center sm:text-left">
                      {isGenerating ? "Creating your picture pendant..." : "Review your picture pendant"}
                    </h2>
                    <p className="mt-2 text-sm text-white/60 text-center sm:text-left">
                      {isGenerating ? "Your custom picture pendant image is being generated." : "Preview the generated image before continuing."}
                    </p>
                    {isGenerating && (
                      <p className="mt-1 text-xs text-white/35 text-center sm:text-left">
                        {generation ? "1" : "0"} of 1 generated
                      </p>
                    )}
                    {generationError && (
                      <div className="mt-4 rounded-2xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {generationError}
                      </div>
                    )}
                    <div className="mt-6">
                      {generation ? (
                        <div className="relative">
                          <div className="overflow-hidden rounded-[32px] border border-white/15 bg-black/35">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={generation.src}
                              alt={generation.label}
                              className="block h-auto w-full"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewOption(generation)}
                            className="absolute right-3 top-3 z-10 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm transition hover:bg-black/85"
                            aria-label="Preview picture pendant draft"
                          >
                            view
                          </button>
                        </div>
                      ) : (
                        <div className="relative min-h-[260px] rounded-[32px] border border-white/12 bg-gradient-to-br from-white/5 via-white/10 to-white/5">
                          <div className="absolute inset-0 animate-pulse rounded-[30px] bg-gradient-to-br from-slate-800 via-slate-900 to-black" />
                          <div className="absolute inset-0 flex items-end justify-center pb-4">
                            <span className="text-xs uppercase tracking-widest text-white/25">Picture pendant draft</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => { if (!confirmDiscardGeneration()) return; cancelPolling(); setGeneration(null); setShowLeadCapture(false); setStep(1); }}
                      className="flex-1 rounded-2xl border border-white/15 bg-black/45 px-5 py-3 text-base font-medium transition hover:border-white/35"
                    >
                      back
                    </button>
                    <button
                      type="button"
                      onClick={handleQuoteRequest}
                      disabled={!generation || quoteStatus !== "idle"}
                      className={`flex-1 rounded-2xl px-5 py-3 text-base font-semibold transition ${
                        quoteStatus === "submitted"
                          ? "cursor-default bg-emerald-600 text-white"
                          : quoteStatus === "submitting"
                            ? "cursor-wait bg-blue-500/70 text-white"
                            : generation
                              ? "bg-blue-500 text-white hover:bg-blue-400"
                              : "cursor-not-allowed border border-white/15 bg-black/45 text-white/50"
                      }`}
                    >
                      {quoteStatus === "submitting" ? "sending..." : quoteStatus === "submitted" ? "sent" : "get a quote"}
                    </button>
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
              )}
            </section>

            <footer className="mt-6 flex items-center justify-between">
              <span className="w-16" aria-hidden />
              <div className="flex items-center justify-center gap-2">
                {([0, 1, 2] as const).map(idx => (
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
                  disabled={!canContinueFromImage}
                  aria-disabled={!canContinueFromImage}
                  className={`rounded-full border px-4 py-2 text-sm uppercase tracking-wide transition ${canContinueFromImage ? "border-blue-500 bg-blue-500/20 text-blue-100 hover:bg-blue-500/30" : "cursor-not-allowed border-white/20 bg-white/5 text-white/40"}`}
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
            onClick={event => event.stopPropagation()}
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
                download="picture-pendant-draft.png"
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
              x
            </button>
          </div>
        </div>
      )}

      {showLeadCapture && (
        <LeadCaptureModal
          requestId={capturedRequestId}
          onSubmitted={(lead) => {
            setLeadContact(lead);
            setShowLeadCapture(false);
            setQuoteError(null);
          }}
        />
      )}
    </>
  );
}
