"use client";

import Link from "next/link";
import { ChangeEvent, ReactNode, useEffect, useState } from "react";
import DesignProgressBar from "../../components/DesignProgressBar";

type ShapeOption = "custom" | "circle" | "shield" | "hexa" | "diamond";
type ColorCombo = "YELLOW_WHITE" | "ROSE_WHITE" | "WHITE";
type SizeOption = "small" | "medium" | "large" | "xl";
type StoneType = "natural" | "lab" | "moissanite" | "cz";
type DiamondQuality = "vs" | "vvs";
type MetalType = "gold" | "silver" | "platinum";

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

export default function LogoPendantBuilder({ basePath }: { basePath?: string } = {}) {
  const [step, setStep] = useState(0);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [shape, setShape] = useState<ShapeOption>("custom");
  const [colorCombo, setColorCombo] = useState<ColorCombo>("YELLOW_WHITE");
  const [includeText, setIncludeText] = useState(false);
  const [additionalTextLines, setAdditionalTextLines] = useState([""]);
  const [size, setSize] = useState<SizeOption>("medium");
  const [stoneType, setStoneType] = useState<StoneType>("natural");
  const [diamondQuality, setDiamondQuality] = useState<DiamondQuality>("vvs");
  const [metalType, setMetalType] = useState<MetalType>("gold");
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

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
  const visibleAdditionalText = additionalTextLines.map(line => line.trim()).filter(Boolean);
  const canAddTextLine = additionalTextLines.length < 2;

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    setLogoFile(event.target.files?.[0] ?? null);
  }

  function handleBack() {
    if (step === 0) return;
    setStep(0);
  }

  function updateAdditionalTextLine(value: string, index: number) {
    setAdditionalTextLines(lines => lines.map((line, lineIndex) => lineIndex === index ? value : line));
  }

  function addAdditionalTextLine() {
    if (!canAddTextLine) return;
    setAdditionalTextLines(lines => [...lines, ""]);
  }

  function removeAdditionalTextLine(index: number) {
    setAdditionalTextLines(lines => lines.filter((_, lineIndex) => lineIndex !== index));
  }

  function uppercaseAdditionalText() {
    setAdditionalTextLines(lines => lines.map(line => line.toUpperCase()));
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
            <DesignProgressBar current={step === 0 ? 1 : 2} className="justify-self-center" />
            <span aria-hidden="true" />
          </div>

          <header>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--theme-text-soft)]">Logo pendant</p>
            <h1 className="mt-2 text-[2.15rem] font-semibold tracking-tight text-[var(--theme-heading)] md:text-[2.5rem]">Build from your mark</h1>
            <p
              className="-mt-1 text-[1.7rem] italic text-[var(--theme-script)]"
              style={{ fontFamily: "var(--font-nostalgic)" }}
            >
              ice it your way.
            </p>
          </header>

          <section className="mt-6 flex-1">
            {step === 0 ? (
              <div className="space-y-7">
                <div className="rounded-[28px] border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface-muted)] p-4">
                  <label className="block">
                    <span className="text-lg font-semibold text-[var(--theme-heading)]">Attach logo image</span>
                    <span className="mt-1 block text-sm text-[var(--theme-text-soft)]">Upload the logo or artwork the pendant should be based on.</span>
                    <input className="sr-only" type="file" accept="image/*" onChange={handleLogoChange} />
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

                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">Additional text?</h2>
                      <p className="text-sm text-[var(--theme-text-soft)]">Add initials, a date, or a short phrase under the logo.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIncludeText(value => !value)}
                      className={cx(
                        "relative h-8 w-14 rounded-full border-2 border-[color:var(--theme-border)] transition",
                        includeText ? "bg-[var(--theme-accent)]" : "bg-[var(--theme-surface)]"
                      )}
                      aria-pressed={includeText}
                      aria-label="Toggle additional text"
                    >
                      <span className={cx("absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white transition", includeText ? "left-7" : "left-1")} />
                    </button>
                  </div>
                  {includeText && (
                    <div className="mt-4 space-y-3">
                      {additionalTextLines.map((line, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <input
                            value={line}
                            onChange={event => updateAdditionalTextLine(event.target.value, index)}
                            placeholder={index === 0 ? "enter text" : "add second line"}
                            className="min-w-0 flex-1 rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-base outline-none transition placeholder:text-[var(--theme-text-muted)] focus:border-[color:var(--theme-border-hover)]"
                          />
                          <div className="flex items-center gap-2">
                            {additionalTextLines.length > 1 && index > 0 && (
                              <button
                                type="button"
                                onClick={() => removeAdditionalTextLine(index)}
                                className="h-12 w-12 rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] text-2xl font-semibold leading-none text-[var(--theme-text-soft)] transition hover:border-[color:var(--theme-border-hover)]"
                                aria-label="Remove additional text line"
                              >
                                -
                              </button>
                            )}
                            {index === additionalTextLines.length - 1 && canAddTextLine && (
                              <button
                                type="button"
                                onClick={addAdditionalTextLine}
                                className="h-12 w-12 rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] text-2xl font-semibold leading-none text-[var(--theme-text-soft)] transition hover:border-[color:var(--theme-border-hover)]"
                                aria-label="Add another additional text line"
                              >
                                +
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={uppercaseAdditionalText}
                          className="rounded-full border border-[color:var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--theme-text-soft)] transition hover:border-[color:var(--theme-border-hover)]"
                        >
                          All Uppercase
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full rounded-2xl bg-[var(--theme-accent)] px-5 py-3 text-base font-semibold text-[var(--theme-accent-contrast)] transition hover:bg-[var(--theme-border-hover)]"
                >
                  Continue
                </button>
              </div>
            ) : (
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
                      {includeText && visibleAdditionalText.length > 0 && (
                        <div className="absolute bottom-8 max-w-[82%] rounded-2xl border border-white/15 bg-black/55 px-4 py-2 text-center text-sm font-semibold leading-5 text-white shadow-lg">
                          {visibleAdditionalText.map(line => (
                            <div key={line} className="break-words">{line}</div>
                          ))}
                        </div>
                      )}
                    </div>
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
                    onClick={() => setStep(0)}
                    className="flex-1 rounded-2xl border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface)] px-5 py-3 text-base font-medium transition hover:border-[color:var(--theme-border-hover)]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    aria-label="Save Logo Draft, coming soon"
                    className="flex flex-1 cursor-not-allowed flex-col items-center gap-1 rounded-2xl bg-[var(--theme-accent)] px-5 py-2.5 text-base font-semibold text-[var(--theme-accent-contrast)] opacity-45 saturate-[0.7]"
                  >
                    Save Logo Draft
                    <span className="rounded-full border border-black/20 bg-black/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--theme-accent-contrast)]">
                      Coming soon
                    </span>
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
