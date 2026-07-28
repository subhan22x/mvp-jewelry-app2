"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import CustomerLeadCaptureScreen from "@/app/components/customer-flow/CustomerLeadCaptureScreen";
import CustomerResultsScreen, { CustomerResultPreviewDialog, type CustomerDesignResult } from "@/app/components/customer-flow/CustomerResultsScreen";
import DesignProgressBar from "../components/DesignProgressBar";
import { cx, themeFocusRing } from "@/src/lib/theme/ui-classes";
import type { NecklaceStyle } from "./necklace-options";

type MetalColor = "yellow_gold" | "white_gold" | "rose_gold";
type StoneType = "vvs_moissanite" | "natural_diamond" | "lab_diamond" | "cz";
type SizeKey = "18" | "20" | "22" | "30";
type FlowStep = "setup" | "contact" | "result";

const METAL_OPTIONS: Array<{ id: MetalColor; label: string; swatch: string }> = [
  { id: "yellow_gold", label: "Yellow Gold", swatch: "from-[#f8d36f] via-[#d8a532] to-[#fff1a8]" },
  { id: "white_gold", label: "White Gold", swatch: "from-[#ffffff] via-[#dce4ee] to-[#aab6c5]" },
  { id: "rose_gold", label: "Rose Gold", swatch: "from-[#f0b092] via-[#d68768] to-[#f7d8ca]" }
];

const SIZE_OPTIONS: Array<{ id: SizeKey; label: string; fit: string; guide: string }> = [
  { id: "18", label: "18 in", fit: "collarbone", guide: "/necklaces/size-guide/chain-18.png" },
  { id: "20", label: "20 in", fit: "upper chest", guide: "/necklaces/size-guide/chain-20.png" },
  { id: "22", label: "22 in", fit: "mid chest", guide: "/necklaces/size-guide/chain-22.png" },
  { id: "30", label: "30 in", fit: "low statement length", guide: "/necklaces/size-guide/chain-30.png" }
];

const STONE_OPTIONS: Array<{ id: StoneType; label: string }> = [
  { id: "vvs_moissanite", label: "VVS Moissanite" },
  { id: "natural_diamond", label: "Natural Diamond" },
  { id: "lab_diamond", label: "Lab Diamond" },
  { id: "cz", label: "CZ" }
];

const DEFAULT_BUDGET_ANCHOR = 15000;
const BUDGET_STEP = 500;

function formatBudget(value: number) {
  if (value >= 1000) return `$${Math.round(value / 100) / 10}k`;
  return `$${value}`;
}

function formatBudgetInput(value: number) {
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`;
  return String(value);
}

function formatBudgetRange(lower: number, upper: number) {
  if (lower <= 0 && upper >= DEFAULT_BUDGET_ANCHOR) return "No budget set";
  return `${formatBudget(lower)} - ${formatBudget(upper)}`;
}

function parseBudgetInput(value: string) {
  const trimmed = value.trim().toLowerCase().replace(/[$,\s]/g, "");
  if (!trimmed) return 0;
  const multiplier = trimmed.endsWith("k") ? 1000 : 1;
  const parsed = Number(trimmed.replace(/k$/, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * multiplier) : 0;
}

export default function NecklacesBuilder({ basePath, initialStyle }: { basePath?: string; initialStyle: NecklaceStyle }) {
  const [flowStep, setFlowStep] = useState<FlowStep>("setup");
  const [metalColor, setMetalColor] = useState<MetalColor>("yellow_gold");
  const [size, setSize] = useState<SizeKey>("22");
  const [stoneType, setStoneType] = useState<StoneType>("vvs_moissanite");
  const [budgetMin, setBudgetMin] = useState(2000);
  const [budgetMax, setBudgetMax] = useState(5000);
  const [budgetMinInput, setBudgetMinInput] = useState("2k");
  const [budgetMaxInput, setBudgetMaxInput] = useState("5k");
  const [inspoName, setInspoName] = useState("");
  const [pendantName, setPendantName] = useState("");
  const [pendantFile, setPendantFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [quoteRequested, setQuoteRequested] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<CustomerDesignResult | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const selectedSize = SIZE_OPTIONS.find(option => option.id === size) ?? SIZE_OPTIONS[2];
  const backHref = basePath ? `${basePath}/necklaces` : "/necklaces";
  const budgetScaleMax = Math.max(DEFAULT_BUDGET_ANCHOR, budgetMax);
  const budgetMinPercent = Math.round((budgetMin / budgetScaleMax) * 100);
  const budgetMaxPercent = Math.round((budgetMax / budgetScaleMax) * 100);
  const updateBudgetMin = (value: number) => {
    const next = Math.min(Math.max(value, 0), budgetMax);
    setBudgetMin(next);
    setBudgetMinInput(formatBudgetInput(next));
  };
  const updateBudgetMax = (value: number) => {
    const next = Math.max(value, budgetMin);
    setBudgetMax(next);
    setBudgetMaxInput(formatBudgetInput(next));
  };

  const accountSlug = basePath?.startsWith("/s/") ? basePath.split("/")[2] : undefined;
  const loadingSteps = [
    "Analyzing jewelry geometry",
    "Mapping pendant placement",
    "Applying metal and stone details",
    "Rendering design preview"
  ];
  const necklaceResultId = requestId ? `necklace-${requestId}` : "necklace-result";
  const necklaceResults: CustomerDesignResult[] = resultImageUrl
    ? [{ id: necklaceResultId, label: `${initialStyle.label} necklace preview`, src: resultImageUrl }]
    : [];

  const pollForResult = async (nextRequestId: string) => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const response = await fetch(`/api/requests/${nextRequestId}`);
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Unable to load generated necklace.");
      const result = Array.isArray(json.results) ? json.results[0] : null;
      if (result?.imageUrl) return result.imageUrl as string;
      if (json.done) {
        const failed = Array.isArray(json.attempts) ? json.attempts.find((item: { status?: string; error?: string }) => item.status === "failed") : null;
        throw new Error(failed?.error ?? "Necklace generation did not return an image.");
      }
      await new Promise(resolve => window.setTimeout(resolve, 2000));
    }
    throw new Error("Necklace generation timed out. Please try again.");
  };

  const ensureQuoteRequest = async (nextRequestId: string) => {
    const response = await fetch("/api/quote-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: nextRequestId,
        customerName: leadName.trim(),
        customerPhone: leadPhone.trim(),
        customerEmail: leadEmail.trim()
      })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error ?? "Unable to request quote.");
    setQuoteRequested(true);
  };

  const handleContinue = async () => {
    if (submitting) return;
    if (!leadName.trim() || !leadPhone.trim() || !leadEmail.trim()) {
      setSubmitError("Enter your name, phone number, and email address.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setResultImageUrl(null);
    setQuoteRequested(false);
    setQuoteError(null);

    const form = new FormData();
    form.set("userId", "demo");
    if (accountSlug) form.set("accountSlug", accountSlug);
    form.set("styleId", initialStyle.id);
    form.set("metalColor", metalColor);
    form.set("size", size);
    form.set("stoneType", stoneType);
    form.set("budgetMinCents", String(budgetMin * 100));
    form.set("budgetMaxCents", String(budgetMax * 100));
    form.set("customerName", leadName.trim());
    form.set("customerPhone", leadPhone.trim());
    form.set("customerEmail", leadEmail.trim());
    if (pendantFile) form.set("pendantImage", pendantFile);

    try {
      const response = await fetch("/api/necklace-requests", {
        method: "POST",
        body: form
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Unable to continue.");
      const nextRequestId = typeof json.requestId === "string" ? json.requestId : null;
      setRequestId(nextRequestId);
      const quoteAlreadyCreated = typeof json.quoteRequestId === "string";
      const imageUrl = json.generated && nextRequestId
        ? await pollForResult(nextRequestId)
        : typeof json.imageUrl === "string"
          ? json.imageUrl
          : null;
      if (!imageUrl) throw new Error("Necklace image was not returned.");
      setResultImageUrl(imageUrl);
      setSelectedResultId(nextRequestId ? `necklace-${nextRequestId}` : "necklace-result");
      if (quoteAlreadyCreated) {
        setQuoteRequested(true);
      } else if (nextRequestId) {
        await ensureQuoteRequest(nextRequestId);
      }
      setFlowStep("result");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to continue.");
    } finally {
      setSubmitting(false);
    }
  };

  if (flowStep === "contact") {
    return (
      <CustomerLeadCaptureScreen
        title="Generating..."
        description="Creating your custom necklace design"
        progressLabel="Preparing necklace preview"
        loadingSteps={loadingSteps}
        name={leadName}
        phone={leadPhone}
        email={leadEmail}
        submitting={submitting}
        error={submitError}
        onNameChange={setLeadName}
        onPhoneChange={setLeadPhone}
        onEmailChange={setLeadEmail}
        onSubmit={() => void handleContinue()}
        onBack={() => setFlowStep("setup")}
      />
    );
  }

  if (flowStep === "result") {
    return (
      <>
        <main className="min-h-dvh px-4 py-4 text-[var(--theme-text)] md:px-8">
          <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col px-4 pb-6 pt-4 sm:px-6 md:px-12">
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
              <div className="mb-8 grid min-h-10 grid-cols-[2.5rem_1fr_2.5rem] items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFlowStep("setup")}
                  aria-label="Back"
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface-muted)] text-xl leading-none text-[var(--theme-text)] transition hover:border-[color:var(--theme-border-hover)]"
                >
                  ←
                </button>
                <DesignProgressBar current={3} className="justify-self-center" />
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
                <CustomerResultsScreen
                  results={necklaceResults}
                  expectedCount={1}
                  selectedResultId={selectedResultId}
                  title="Choose your favourite"
                  subtitle="Select the necklace preview that matches your vision best. We'll refine it for production."
                  errors={[quoteError]}
                  successMessage={quoteRequested ? "Your design and contact details were sent to the store. They can prepare a quote from this generated option." : null}
                  onSelect={setSelectedResultId}
                  onPreview={setPreviewResult}
                />
              </section>
            </div>
          </div>
        </main>
        {previewResult ? <CustomerResultPreviewDialog result={previewResult} onClose={() => setPreviewResult(null)} /> : null}
      </>
    );
  }

  return (
    <main className="min-h-dvh px-4 py-2 text-[var(--theme-text)] md:px-8">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col px-4 pb-5 pt-2 sm:px-6 md:px-12">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <div className="mb-5 grid min-h-10 grid-cols-[2.5rem_1fr_2.5rem] items-center gap-3">
          <Link
            href={backHref}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface-muted)] text-xl leading-none text-[var(--theme-text)] transition hover:border-[color:var(--theme-border-hover)]"
          >
            ←
          </Link>
          <DesignProgressBar current={1} className="justify-self-center" />
          <span aria-hidden="true" />
        </div>

        <header>
          <p className="text-[11px] uppercase tracking-[0.35em] text-white/70">002</p>
          <h1 className="mt-1 text-[1.7rem] font-bold leading-none tracking-tight text-[var(--theme-heading)] md:text-[2.35rem]">{initialStyle.label} necklace</h1>
          <p
            className="mt-0.5 text-[1.25rem] italic leading-none text-[var(--theme-script)] md:mt-1 md:text-2xl"
            style={{ fontFamily: "var(--font-nostalgic)" }}
          >
            customize the fit.
          </p>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-[var(--theme-text-soft)] sm:text-sm">
            Choose the color, size, stone type, and pendant image for this chain.
          </p>
        </header>

        <section className="mt-4 flex-1 space-y-4">
          <div>
            <h2 className="text-base font-semibold">Selected Style</h2>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] p-2.5">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-black sm:h-24 sm:w-24">
                {initialStyle.thumb ? (
                  <Image
                    src={initialStyle.thumb}
                    alt={initialStyle.label}
                    fill
                    sizes="112px"
                    className="object-cover object-center"
                    priority
                  />
                ) : (
                  <label className={cx("flex h-full cursor-pointer items-center justify-center px-3 text-center text-xs font-semibold text-[var(--theme-text-soft)]", themeFocusRing)}>
                    Upload inspo
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      suppressHydrationWarning
                      onChange={event => setInspoName(event.target.files?.[0]?.name ?? "")}
                    />
                  </label>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[var(--theme-text)]">{initialStyle.label}</p>
                <p className="mt-0.5 text-xs text-[var(--theme-text-soft)]">
                  {initialStyle.upload ? inspoName || "Upload a chain reference on this step." : "Chain style selected."}
                </p>
                <Link href={backHref} className="mt-2 inline-flex rounded-full border-2 border-[color:var(--theme-border)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-text)] transition hover:border-[color:var(--theme-border-hover)]">
                  Change Style
                </Link>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-base font-semibold">Build Details</h2>

            <div className="mt-3 space-y-4">
              <fieldset>
                <legend className="text-sm font-semibold text-[var(--theme-text-soft)]">Color</legend>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {METAL_OPTIONS.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setMetalColor(option.id)}
                      className={cx(
                        "flex h-16 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 bg-[var(--theme-surface)] p-2 text-center text-[10px] font-semibold leading-tight transition sm:h-20 sm:text-xs",
                        themeFocusRing,
                        metalColor === option.id
                          ? "border-[color:var(--theme-selected-border)] shadow-[0_0_0_1px_var(--theme-selected-border),0_0_22px_var(--theme-selected-glow)]"
                          : "border-[color:var(--theme-border)] hover:border-[color:var(--theme-border-hover)]"
                      )}
                    >
                      <span className={cx("h-7 w-7 rounded-full bg-gradient-to-br shadow-inner shadow-white/30", option.swatch)} aria-hidden />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div>
                <h3 className="text-sm font-semibold text-[var(--theme-text-soft)]">Size</h3>
                <div className="mt-2 rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] p-2.5">
                  <div className="relative h-[42vh] max-h-[360px] min-h-[280px] overflow-hidden rounded-xl bg-black">
                    <Image
                      src={selectedSize.guide}
                      alt={`${selectedSize.label} chain length guide`}
                      fill
                      sizes="(max-width: 768px) 100vw, 640px"
                      className="object-contain object-top"
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {SIZE_OPTIONS.map(option => {
                      const isActive = option.id === size;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSize(option.id)}
                          className={cx(
                            "min-h-11 rounded-xl border-2 px-2 py-2 text-xs font-semibold transition",
                            themeFocusRing,
                            isActive
                              ? "border-[color:var(--theme-selected-border)] bg-[var(--theme-surface-muted)] text-[var(--theme-heading)]"
                              : "border-[color:var(--theme-border)] text-[var(--theme-text-soft)] hover:border-[color:var(--theme-border-hover)]"
                          )}
                        >
                          {option.id}&quot;
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-[var(--theme-text-soft)]">{selectedSize.label} sits around the {selectedSize.fit} for most men.</p>
                </div>
              </div>

              <label className="block text-sm font-semibold text-[var(--theme-text-soft)]">
                Diamond stone type
                <select
                  value={stoneType}
                  onChange={event => setStoneType(event.target.value as StoneType)}
                  className={cx("mt-2 w-full rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-base font-semibold text-[var(--theme-text)] outline-none transition focus:border-[color:var(--theme-selected-border)]", themeFocusRing)}
                >
                  {STONE_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>

              <div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-[var(--theme-text)]">Budget</span>
                  <span className="h-px flex-1 bg-[var(--theme-border)]" aria-hidden />
                  <span className="text-lg font-bold leading-none text-[var(--theme-heading)]">{formatBudgetRange(budgetMin, budgetMax)}</span>
                </div>
                <div className="mt-3 rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] px-4 py-5">
                  <div className="relative h-8">
                    <div className="absolute top-3.5 h-1.5 w-full rounded-full bg-[var(--theme-surface-muted)]" />
                    <div
                      className="absolute top-3.5 h-1.5 rounded-full bg-[var(--theme-accent)]"
                      style={{ left: `${budgetMinPercent}%`, right: `${100 - budgetMaxPercent}%` }}
                    />
                    <input
                      aria-label="Minimum budget"
                      type="range"
                      min="0"
                      max={budgetScaleMax}
                      step={BUDGET_STEP}
                      value={budgetMin}
                      onChange={event => updateBudgetMin(Number(event.target.value))}
                      className="range-thumb pointer-events-none absolute top-0 z-20 h-8 w-full appearance-none bg-transparent"
                    />
                    <input
                      aria-label="Maximum budget"
                      type="range"
                      min="0"
                      max={budgetScaleMax}
                      step={BUDGET_STEP}
                      value={budgetMax}
                      onChange={event => updateBudgetMax(Number(event.target.value))}
                      className="range-thumb pointer-events-none absolute top-0 z-30 h-8 w-full appearance-none bg-transparent"
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-[var(--theme-text-soft)]">
                    <input
                      aria-label="Minimum budget amount"
                      value={budgetMinInput}
                      inputMode="decimal"
                      onChange={event => setBudgetMinInput(event.target.value)}
                      onBlur={() => updateBudgetMin(parseBudgetInput(budgetMinInput))}
                      onKeyDown={event => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                      className="h-8 w-16 rounded-lg border border-[color:var(--theme-border)] bg-transparent px-2 text-left text-xs font-semibold text-[var(--theme-text-soft)] outline-none focus:border-[color:var(--theme-selected-border)]"
                    />
                    <input
                      aria-label="Maximum budget amount"
                      value={budgetMaxInput}
                      inputMode="decimal"
                      onChange={event => setBudgetMaxInput(event.target.value)}
                      onBlur={() => updateBudgetMax(parseBudgetInput(budgetMaxInput))}
                      onKeyDown={event => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                      className="h-8 w-16 rounded-lg border border-[color:var(--theme-border)] bg-transparent px-2 text-right text-xs font-semibold text-[var(--theme-text-soft)] outline-none focus:border-[color:var(--theme-selected-border)]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-4 h-px w-full bg-[var(--theme-border)]" aria-hidden />
                <h3 className="text-lg font-bold leading-tight tracking-tight text-[var(--theme-heading)]">
                  Upload your pendant and see how it looks with the chain
                </h3>
                <label className={cx("mt-3 flex h-32 w-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[color:var(--theme-border)] bg-[var(--theme-surface)] p-4 text-center text-xs font-semibold text-[var(--theme-text)] transition hover:border-[color:var(--theme-border-hover)]", themeFocusRing)}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[color:var(--theme-border)] text-xl" aria-hidden>
                    ↑
                  </span>
                  <span>{pendantName ? pendantName : "Add a pendant to try on"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    suppressHydrationWarning
                    onChange={event => {
                      const file = event.target.files?.[0] ?? null;
                      setPendantFile(file);
                      setPendantName(file?.name ?? "");
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Review Setup</h2>
            <div className="mt-4 rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] p-4">
              <dl className="grid gap-3 text-sm text-[var(--theme-text-soft)] sm:grid-cols-2">
                <div><dt>Style</dt><dd className="font-semibold text-[var(--theme-text)]">{initialStyle.label}</dd></div>
                <div><dt>Color</dt><dd className="font-semibold text-[var(--theme-text)]">{METAL_OPTIONS.find(option => option.id === metalColor)?.label}</dd></div>
                <div><dt>Size</dt><dd className="font-semibold text-[var(--theme-text)]">{selectedSize.label}</dd></div>
                <div><dt>Stone</dt><dd className="font-semibold text-[var(--theme-text)]">{STONE_OPTIONS.find(option => option.id === stoneType)?.label}</dd></div>
                <div><dt>Budget</dt><dd className="font-semibold text-[var(--theme-text)]">{formatBudgetRange(budgetMin, budgetMax)}</dd></div>
                <div><dt>Pendant</dt><dd className="font-semibold text-[var(--theme-text)]">{pendantName || "None attached"}</dd></div>
              </dl>
            </div>
            <button
              type="button"
              onClick={() => {
                setSubmitError(null);
                setFlowStep("contact");
              }}
              className={cx("mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-[var(--theme-accent)] text-sm font-bold text-black transition hover:brightness-110", themeFocusRing)}
            >
              Continue
            </button>
          </div>
        </section>
        </div>
      </div>
      <style jsx>{`
        .range-thumb::-webkit-slider-runnable-track {
          background: transparent;
          border: 0;
        }
        .range-thumb::-webkit-slider-thumb {
          appearance: none;
          pointer-events: auto;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          border: 3px solid var(--theme-selected-border);
          background: #ffffff;
          box-shadow: 0 0 0 3px var(--theme-surface);
          cursor: pointer;
        }
        .range-thumb::-moz-range-track {
          background: transparent;
          border: 0;
        }
        .range-thumb::-moz-range-thumb {
          pointer-events: auto;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          border: 3px solid var(--theme-selected-border);
          background: #ffffff;
          box-shadow: 0 0 0 3px var(--theme-surface);
          cursor: pointer;
        }
      `}</style>
    </main>
  );
}
