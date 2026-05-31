"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  quoteId: string;
  quotedPriceCents: number | null;
  quoteNotes: string | null;
  estimatedDelivery: string | null;
  quoteMaterial: string | null;
  quoteMaterialKarat: string | null;
  quoteStoneType: string | null;
  imageUrl: string | null;
  customerPhone: string;
  customerDetails: Array<{ label: string; value: string | null | undefined }>;
  designDetails: Array<{ label: string; value: string | null | undefined }>;
};

const DELIVERY_OPTIONS = ["1 week", "2 weeks", "3-4 weeks", "6-8 weeks"] as const;
const MATERIAL_OPTIONS = [
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
  { value: "platinum", label: "Platinum" },
] as const;
const KARAT_OPTIONS = ["18k", "14k", "10k"] as const;
const STONE_OPTIONS = [
  { value: "natural_diamonds", label: "Natural Diamonds" },
  { value: "cz", label: "CZ" },
  { value: "moissanite", label: "Moissanite" },
  { value: "lab_diamonds", label: "Lab Diamonds" },
  { value: "other", label: "Other" },
] as const;

function centsToDollars(value: number | null) {
  return typeof value === "number" ? (value / 100).toFixed(2) : "";
}

function ReviewDetailGroup({ title, details, columns = false }: { title: string; details: Array<{ label: string; value: string | null | undefined }>; columns?: boolean }) {
  const visibleDetails = details.filter(detail => detail.value);
  if (visibleDetails.length === 0) return null;

  return (
    <div className="min-w-0 rounded-2xl border border-white/5 bg-[#101114]/75 p-3">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#9ba3b4]">{title}</h3>
      <dl className={`mt-2 grid gap-x-4 gap-y-2 ${columns ? "sm:grid-cols-2" : ""}`}>
        {visibleDetails.map(detail => (
          <div key={detail.label} className="min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#D1B873]">{detail.label}</dt>
            <dd className="mt-0.5 break-words text-[13px] font-medium leading-5 text-[#f2f3f8]">{detail.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function deliveryOptionFor(value: string | null) {
  if (!value) return "";
  return DELIVERY_OPTIONS.some(option => option === value) ? value : "custom";
}

function optionLabel<T extends ReadonlyArray<{ value: string; label: string }>>(options: T, value: string) {
  return options.find(option => option.value === value)?.label ?? value;
}

function buildQuoteMessage({
  price,
  estimatedDelivery,
  material,
  materialKarat,
  stoneType,
  notes,
}: {
  price: string;
  estimatedDelivery: string;
  material: string;
  materialKarat: string;
  stoneType: string;
  notes: string;
}) {
  const materialLabel = material
    ? `${material === "gold" && materialKarat ? `${materialKarat.toUpperCase()} ` : ""}${optionLabel(MATERIAL_OPTIONS, material)}`
    : "";
  const lines = [
    "Your custom jewelry quote is ready.",
    "",
    `Price: $${Number.parseFloat(price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    estimatedDelivery ? `Estimated delivery: ${estimatedDelivery}` : "",
    materialLabel ? `Material: ${materialLabel}` : "",
    stoneType ? `Stone: ${optionLabel(STONE_OPTIONS, stoneType)}` : "",
    notes.trim() ? `Message: ${notes.trim()}` : "",
  ].filter(Boolean);

  return lines.join("\n");
}

export default function SendQuoteForm({
  quoteId,
  quotedPriceCents,
  quoteNotes,
  estimatedDelivery,
  quoteMaterial,
  quoteMaterialKarat,
  quoteStoneType,
  imageUrl,
  customerPhone,
  customerDetails,
  designDetails
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [price, setPrice] = useState(centsToDollars(quotedPriceCents));
  const [notes, setNotes] = useState(quoteNotes ?? "");
  const [deliveryOption, setDeliveryOption] = useState(deliveryOptionFor(estimatedDelivery));
  const [customDelivery, setCustomDelivery] = useState(deliveryOptionFor(estimatedDelivery) === "custom" ? estimatedDelivery ?? "" : "");
  const [material, setMaterial] = useState(quoteMaterial ?? "");
  const [materialKarat, setMaterialKarat] = useState(quoteMaterialKarat ?? "");
  const [stoneType, setStoneType] = useState(quoteStoneType ?? "");
  const [error, setError] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function quoteMessage() {
    return buildQuoteMessage({
      price,
      estimatedDelivery: deliveryOption === "custom" ? customDelivery.trim() : deliveryOption,
      material,
      materialKarat,
      stoneType,
      notes,
    });
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(quoteMessage());
      setShareFeedback("Message copied.");
    } catch {
      setShareFeedback("Unable to copy automatically. Use Share instead.");
    }
  }

  async function shareMessage() {
    if (!navigator.share) {
      setShareFeedback("Native sharing is not available on this device. Copy the message instead.");
      return;
    }

    try {
      await navigator.share({
        title: "Customer quote",
        text: quoteMessage(),
      });
      setShareFeedback("Share sheet opened.");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setShareFeedback("Unable to open the share sheet. Copy the message instead.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const parsedPrice = Number.parseFloat(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setSubmitting(false);
      setError("Enter a valid quote price.");
      return;
    }

    try {
      const response = await fetch(`/api/quote-requests/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotedPriceCents: Math.round(parsedPrice * 100),
          quoteNotes: notes.trim(),
          estimatedDelivery: deliveryOption === "custom" ? customDelivery.trim() : deliveryOption,
          quoteMaterial: material,
          quoteMaterialKarat: material === "gold" ? materialKarat : "",
          quoteStoneType: stoneType,
          status: "sent"
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Unable to send quote.");
      setOpen(false);
      setShareFeedback(null);
      setShareOpen(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send quote.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#3B82F6] px-5 text-sm font-semibold text-white shadow-[0_0_25px_rgba(59,130,246,0.35)] transition hover:bg-blue-400"
      >
        Send Quote
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Send quote"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <form
            onSubmit={handleSubmit}
            className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#D1B873]/25 bg-[#17191F] p-6 text-[#e1e2ec] shadow-[0_28px_80px_rgba(0,0,0,0.65)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#D1B873]">Quote</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Send to Customer</h2>
                <p className="mt-1 text-sm text-[#c2c6d6]">Save the price and mark this quote as sent.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-sm text-white/75 hover:border-white/30"
              >
                close
              </button>
            </div>

            <section className="mt-5 rounded-2xl border border-[#D1B873]/15 bg-black/25 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D1B873]">Review before pricing</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-[150px_1fr]">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                  {imageUrl ? (
                    <img src={imageUrl} alt="" className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center px-3 text-center text-xs text-[#8c909f]">No generated image</div>
                  )}
                </div>
                <div className="grid min-w-0 gap-4">
                  <ReviewDetailGroup title="Customer" details={customerDetails} />
                  <ReviewDetailGroup title="Design details" details={designDetails} columns />
                </div>
              </div>
            </section>

            <section className="mt-5 grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">Estimated delivery</span>
                <select
                  value={deliveryOption}
                  onChange={event => setDeliveryOption(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/45 px-4 text-base text-white outline-none focus:border-white/35"
                >
                  <option value="">Select delivery timeline</option>
                  {DELIVERY_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                  <option value="custom">Custom</option>
                </select>
              </label>
              {deliveryOption === "custom" && (
                <label className="sm:col-span-2">
                  <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">Custom delivery text</span>
                  <input
                    value={customDelivery}
                    onChange={event => setCustomDelivery(event.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/45 px-4 text-base text-white outline-none placeholder:text-white/30 focus:border-white/35"
                    placeholder="e.g. Ready after CAD approval"
                  />
                </label>
              )}

              <label>
                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">Material</span>
                <select
                  value={material}
                  onChange={event => {
                    setMaterial(event.target.value);
                    if (event.target.value !== "gold") setMaterialKarat("");
                  }}
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/45 px-4 text-base text-white outline-none focus:border-white/35"
                >
                  <option value="">Select material</option>
                  {MATERIAL_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>

              <label>
                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">Gold karat</span>
                <select
                  value={materialKarat}
                  onChange={event => setMaterialKarat(event.target.value)}
                  disabled={material !== "gold"}
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/45 px-4 text-base text-white outline-none focus:border-white/35 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <option value="">Select karat</option>
                  {KARAT_OPTIONS.map(option => <option key={option} value={option}>{option.toUpperCase()}</option>)}
                </select>
              </label>

              <label className="sm:col-span-2">
                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">Stone type</span>
                <select
                  value={stoneType}
                  onChange={event => setStoneType(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/45 px-4 text-base text-white outline-none focus:border-white/35"
                >
                  <option value="">Select stone type</option>
                  {STONE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </section>

            <label htmlFor={`quote-price-${quoteId}`} className="mt-5 block text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">
              Quote price
            </label>
            <div className="mt-2 flex items-center rounded-2xl border border-white/10 bg-black/45 px-4 focus-within:border-white/35">
              <span className="text-white/45">$</span>
              <input
                id={`quote-price-${quoteId}`}
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={event => setPrice(event.target.value)}
                className="w-full border-0 bg-transparent px-2 py-3 text-base text-white outline-none focus:ring-0"
                placeholder="450.00"
                required
              />
            </div>

            <label htmlFor={`quote-notes-${quoteId}`} className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">
              Message to customer
            </label>
            <textarea
              id={`quote-notes-${quoteId}`}
              value={notes}
              onChange={event => setNotes(event.target.value)}
              className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-white/35"
              placeholder="Optional note about production time, materials, or next steps."
            />

            {error && (
              <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 w-full rounded-2xl bg-[#3B82F6] px-5 py-3 text-base font-semibold text-white transition hover:bg-blue-400 disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? "saving..." : "Send to Customer"}
            </button>
          </form>
        </div>
      )}

      {shareOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Share quote"
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center"
        >
          <div className="w-full max-w-md rounded-3xl border border-[#D1B873]/25 bg-[#17191F] p-5 text-[#e1e2ec] shadow-[0_28px_80px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#D1B873]">Quote saved</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Share with customer</h2>
                <p className="mt-1 text-sm text-[#c2c6d6]">
                  Send the prepared quote message to {customerPhone || "the customer"}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-sm text-white/75 hover:border-white/30"
              >
                close
              </button>
            </div>

            <pre className="mt-4 max-h-52 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/35 p-4 font-sans text-sm leading-6 text-white/80">
              {quoteMessage()}
            </pre>

            {shareFeedback && (
              <div className="mt-3 rounded-2xl border border-[#D1B873]/25 bg-[#D1B873]/10 px-4 py-3 text-sm text-[#f3d98f]">
                {shareFeedback}
              </div>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={copyMessage}
                className="rounded-2xl border border-[#D1B873]/30 bg-black/35 px-5 py-3 text-sm font-semibold text-[#f3d98f] transition hover:bg-black/55"
              >
                Copy Message
              </button>
              <button
                type="button"
                onClick={shareMessage}
                className="rounded-2xl bg-[#D1B873] px-5 py-3 text-sm font-semibold text-[#17120a] transition hover:bg-[#e6cb82]"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
