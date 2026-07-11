"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type QuoteImageOption = {
  key: string;
  kind: "result" | "revision";
  id: string;
  sourceResultId: string;
  imageUrl: string;
  label: string;
};

type QuoteData = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  productType: string | null;
  text: string | null;
  styleId: string | null;
  quotedPriceCents: number | null;
  quoteNotes: string | null;
  estimatedDelivery: string | null;
  quoteMaterial: string | null;
  quoteMaterialKarat: string | null;
  quoteStoneType: string | null;
  designedImageUrl: string | null;
};

const DELIVERY_OPTIONS = ["1 week", "2 weeks", "3-4 weeks", "6-8 weeks"];
const MATERIAL_OPTIONS = [
  ["gold", "Gold"],
  ["gold_plated", "Gold plated"],
  ["silver", "Silver"],
  ["platinum", "Platinum"]
] as const;
const STONE_OPTIONS = [
  ["natural_diamonds", "Natural Diamonds"],
  ["lab_diamonds", "Lab Diamonds"],
  ["moissanite", "Moissanite"],
  ["cz", "CZ"],
  ["other", "Other"]
] as const;

function initialDelivery(value: string | null) {
  if (!value) return { option: "", custom: "" };
  return DELIVERY_OPTIONS.includes(value) ? { option: value, custom: "" } : { option: "custom", custom: value };
}

export default function QuotePreparationForm({
  quote,
  imageOptions,
  initialSelectedKey
}: {
  quote: QuoteData;
  imageOptions: QuoteImageOption[];
  initialSelectedKey: string | null;
}) {
  const router = useRouter();
  const delivery = initialDelivery(quote.estimatedDelivery);
  const [selectedKey, setSelectedKey] = useState(initialSelectedKey);
  const [price, setPrice] = useState(quote.quotedPriceCents === null ? "" : (quote.quotedPriceCents / 100).toFixed(2));
  const [notes, setNotes] = useState(quote.quoteNotes ?? "");
  const [deliveryOption, setDeliveryOption] = useState(delivery.option);
  const [customDelivery, setCustomDelivery] = useState(delivery.custom);
  const [material, setMaterial] = useState(quote.quoteMaterial ?? "");
  const [karat, setKarat] = useState(quote.quoteMaterialKarat ?? "");
  const [stone, setStone] = useState(quote.quoteStoneType ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = imageOptions.find(option => option.key === selectedKey) ?? null;
  const fallbackImage = selected?.imageUrl ?? quote.designedImageUrl;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent = submitter?.value === "media" ? "media" : "send";
    const parsedPrice = Number.parseFloat(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Enter a valid quote price.");
      return;
    }
    if (imageOptions.length > 0 && !selected) {
      setError("Choose the generation that should appear on this quote.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const selection = selected?.kind === "revision"
        ? { resultRevisionId: selected.id }
        : selected
          ? { resultId: selected.id }
          : {};
      const response = await fetch(`/api/quote-requests/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selection,
          quotedPriceCents: Math.round(parsedPrice * 100),
          quoteNotes: notes.trim(),
          estimatedDelivery: deliveryOption === "custom" ? customDelivery.trim() : deliveryOption,
          quoteMaterial: material,
          quoteMaterialKarat: material === "gold" ? karat : "",
          quoteStoneType: stone,
          previewMediaType: intent === "send" ? "image" : undefined,
          status: intent === "send" ? "sent" : "priced"
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Unable to save this quote.");
      router.push(`/owner/quotes/${quote.id}/${intent === "send" ? "preview" : "media"}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save this quote.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
      <section className="min-w-0 rounded-2xl border border-white/5 bg-[#17191F] p-4 md:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#D1B873] md:text-xs">Prepare quote</p>
        <h1 className="mt-1.5 text-2xl font-bold leading-tight text-white md:mt-2 md:text-3xl">Choose the customer&apos;s design</h1>
        <p className="mt-1.5 text-xs leading-5 text-[#c2c6d6] md:mt-2 md:text-sm">This exact image will be stored with the quote and used for any optional preview asset.</p>

        {imageOptions.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-2 md:mt-5 md:gap-3 sm:grid-cols-3">
            {imageOptions.map(option => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSelectedKey(option.key)}
                aria-pressed={selectedKey === option.key}
                className={`overflow-hidden rounded-2xl border text-left transition ${selectedKey === option.key ? "border-[#D1B873] ring-2 ring-[#D1B873]/25" : "border-white/10 hover:border-white/30"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={option.imageUrl} alt={option.label} className="h-28 w-full object-cover md:h-auto md:aspect-square" />
                <span className="block bg-black/35 px-2 py-1.5 text-[11px] font-semibold text-white md:px-3 md:py-2 md:text-xs">{option.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/35 md:mt-5">
            {fallbackImage ? <img src={fallbackImage} alt="Customer reference" className="aspect-video w-full object-contain" /> : <div className="p-8 text-center text-sm text-[#8c909f]">No generated image is attached.</div>}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 rounded-2xl border border-white/5 bg-black/20 p-3 md:mt-6 md:gap-3 md:p-4">
          <div className="min-w-0"><p className="text-[9px] uppercase tracking-wider text-[#8c909f] md:text-[10px]">Customer</p><p className="mt-0.5 truncate text-sm font-semibold text-white md:mt-1 md:text-base">{quote.customerName}</p></div>
          <div className="min-w-0"><p className="text-[9px] uppercase tracking-wider text-[#8c909f] md:text-[10px]">Phone</p><p className="mt-0.5 truncate text-sm text-white md:mt-1 md:text-base">{quote.customerPhone}</p></div>
          <div className="min-w-0"><p className="text-[9px] uppercase tracking-wider text-[#8c909f] md:text-[10px]">Email</p><p className="mt-0.5 truncate text-sm text-white md:mt-1 md:text-base">{quote.customerEmail || "Not provided"}</p></div>
          <div className="min-w-0"><p className="text-[9px] uppercase tracking-wider text-[#8c909f] md:text-[10px]">Design</p><p className="mt-0.5 truncate text-sm text-white md:mt-1 md:text-base">{quote.text || quote.productType || "Custom jewelry"}{quote.styleId ? ` / ${quote.styleId}` : ""}</p></div>
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-[#D1B873]/20 bg-[#17191F] p-4 md:p-6">
        <h2 className="text-xl font-bold text-white md:text-2xl">Quote details</h2>
        <div className="mt-3 grid gap-3 md:mt-5 md:gap-4">
          <label className="grid gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8c909f] md:gap-2 md:text-xs">Estimated delivery
            <select value={deliveryOption} onChange={event => setDeliveryOption(event.target.value)} className="h-10 rounded-2xl border border-white/10 bg-black/45 px-3 text-sm normal-case tracking-normal text-white md:h-12 md:px-4 md:text-base">
              <option value="">Select timeline</option>{DELIVERY_OPTIONS.map(option => <option key={option}>{option}</option>)}<option value="custom">Custom</option>
            </select>
          </label>
          {deliveryOption === "custom" ? <input value={customDelivery} onChange={event => setCustomDelivery(event.target.value)} placeholder="Custom delivery timeline" className="h-10 rounded-2xl border border-white/10 bg-black/45 px-3 text-sm text-white md:h-12 md:px-4 md:text-base" /> : null}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <label className="min-w-0 grid gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8c909f] md:gap-2 md:text-xs">Material
              <select value={material} onChange={event => setMaterial(event.target.value)} className="h-10 min-w-0 rounded-2xl border border-white/10 bg-black/45 px-3 text-sm normal-case tracking-normal text-white md:h-12 md:px-4 md:text-base"><option value="">Select</option>{MATERIAL_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            </label>
            <label className="min-w-0 grid gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8c909f] md:gap-2 md:text-xs">Gold karat
              <select value={karat} onChange={event => setKarat(event.target.value)} disabled={material !== "gold"} className="h-10 min-w-0 rounded-2xl border border-white/10 bg-black/45 px-3 text-sm normal-case tracking-normal text-white disabled:opacity-40 md:h-12 md:px-4 md:text-base"><option value="">Select</option>{["10k", "14k", "18k"].map(value => <option key={value}>{value.toUpperCase()}</option>)}</select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <label className="min-w-0 grid gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8c909f] md:gap-2 md:text-xs">Stone
              <select value={stone} onChange={event => setStone(event.target.value)} className="h-10 min-w-0 rounded-2xl border border-white/10 bg-black/45 px-3 text-sm normal-case tracking-normal text-white md:h-12 md:px-4 md:text-base"><option value="">Select</option>{STONE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            </label>
            <label className="min-w-0 grid gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8c909f] md:gap-2 md:text-xs">Price
              <div className="flex min-w-0 w-full h-10 items-center rounded-2xl border border-white/10 bg-black/45 px-3 md:h-12 md:px-4"><span className="shrink-0 text-white/45">$</span><input required type="number" min="0" step="0.01" value={price} onChange={event => setPrice(event.target.value)} className="min-w-0 w-full flex-1 bg-transparent px-1.5 text-sm font-normal tracking-normal text-white outline-none md:px-2 md:text-base" /></div>
            </label>
          </div>
          <label className="grid gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8c909f] md:gap-2 md:text-xs">Message
            <textarea value={notes} onChange={event => setNotes(event.target.value)} rows={2} className="min-h-16 rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white md:min-h-32 md:px-4 md:py-3 md:text-base" />
          </label>
        </div>
        {error ? <p className="mt-3 rounded-2xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100 md:mt-4 md:px-4 md:py-3">{error}</p> : null}
        <div className="mt-3 grid gap-2 md:mt-5 md:gap-3">
          <button type="submit" name="intent" value="send" disabled={submitting} className="h-12 w-full rounded-2xl bg-[#3B82F6] px-5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:opacity-60 md:h-14 md:text-base">
            {submitting ? "Saving..." : "Send Image Quote"}
          </button>
          <button type="submit" name="intent" value="media" disabled={submitting} className="h-10 w-full rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-60 md:h-12">
            Choose Preview Asset
          </button>
        </div>
      </section>
    </form>
  );
}
