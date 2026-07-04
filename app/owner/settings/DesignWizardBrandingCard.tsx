"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadFileDirectly } from "@/src/lib/uploads/direct-r2";

type BrandMode = "logo" | "name" | "none";

type DesignWizardBrandingCardProps = {
  displayName: string;
  logoUrl: string | null;
  initialMode: BrandMode;
};

const MODE_OPTIONS: { value: BrandMode; label: string; hint: string }[] = [
  { value: "logo", label: "Logo", hint: "Show your uploaded logo or profile picture." },
  { value: "name", label: "Business name", hint: "Show your store name as text." },
  { value: "none", label: "Neither", hint: "Keep the header clean — just the progress steps." }
];

export default function DesignWizardBrandingCard({ displayName, logoUrl, initialMode }: DesignWizardBrandingCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<BrandMode>(initialMode);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : logoUrl), [imageFile, logoUrl]);
  const hasLogo = Boolean(previewUrl);
  const activeOption = MODE_OPTIONS.find(option => option.value === mode) ?? MODE_OPTIONS[0];

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (mode === "logo" && !hasLogo) setMode("name");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLogo]);

  async function save() {
    setError(null);
    setStatus(null);

    if (mode === "logo" && !hasLogo) {
      setError("Upload a logo first, or choose another option.");
      return;
    }

    const form = new FormData();
    form.set("mode", mode);
    if (imageFile) {
      const upload = await uploadFileDirectly(imageFile, "owner-profile");
      if (upload) form.set("logoUpload", JSON.stringify(upload));
      else form.set("logo", imageFile);
    }

    const response = await fetch("/api/owner/design-brand", { method: "PATCH", body: form });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? "Unable to save.");
      return;
    }

    setStatus("Saved.");
    setImageFile(null);
    startTransition(() => router.refresh());
  }

  return (
    <section className="rounded-xl border border-white/5 bg-[#17191F] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f7bc5f]">Design wizard</p>
      <h2 className="mt-3 text-2xl font-bold text-[#e1e2ec]">Header branding</h2>
      <p className="mt-2 text-sm leading-6 text-[#c2c6d6]">
        Choose what customers see above the progress bar when they design a custom piece with you.
      </p>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex flex-none flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-[#101114]">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Logo preview" className="h-full w-full object-contain p-2" />
            ) : (
              <span className="text-lg font-black text-[#f7bc5f]">{displayName.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <label className="cursor-pointer rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-[#d7dbe8] transition hover:border-[#f7bc5f]/60 hover:text-[#f7bc5f]">
            {hasLogo ? "Change logo" : "Upload logo"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={event => setImageFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="flex-1">
          <div className="grid grid-cols-3 gap-2">
            {MODE_OPTIONS.map(option => {
              const disabled = option.value === "logo" && !hasLogo;
              const active = mode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => setMode(option.value)}
                  className={`rounded-lg border px-2 py-2.5 text-center text-xs font-bold transition sm:text-sm ${
                    active ? "border-[#f7bc5f] bg-[#f7bc5f]/10 text-[#f7bc5f]" : "border-white/10 bg-[#101114] text-[#e1e2ec] hover:border-white/25"
                  } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 text-xs leading-5 text-[#8c909f]">
            {activeOption.value === "logo" && !hasLogo ? "Upload a logo to enable this." : activeOption.hint}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center rounded-lg border border-white/10 bg-[#101114] py-5">
        {mode === "none" ? (
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#565b6b]">No branding shown</span>
        ) : mode === "logo" && previewUrl ? (
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" className="h-full w-full object-contain p-1.5" />
          </div>
        ) : (
          <span
            className="text-[15px] font-bold text-[#e1e2ec]"
            style={{ fontFamily: "var(--font-plus-jakarta), sans-serif" }}
          >
            {displayName}
          </span>
        )}
      </div>

      {error && <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p>}
      {status && <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">{status}</p>}

      <button
        type="button"
        onClick={save}
        disabled={isPending}
        className="mt-5 rounded-full bg-[#f7bc5f] px-5 py-3 text-sm font-bold text-black hover:bg-[#ffd88a] disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Save"}
      </button>
    </section>
  );
}
