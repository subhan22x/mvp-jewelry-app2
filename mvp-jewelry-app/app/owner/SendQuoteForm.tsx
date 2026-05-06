"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  quoteId: string;
  status: string;
  quotedPriceCents: number | null;
  quoteNotes: string | null;
};

function centsToDollars(value: number | null) {
  return typeof value === "number" ? (value / 100).toFixed(2) : "";
}

export default function SendQuoteForm({ quoteId, status, quotedPriceCents, quoteNotes }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(centsToDollars(quotedPriceCents));
  const [notes, setNotes] = useState(quoteNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(status === "sent");
  const [submitting, setSubmitting] = useState(false);

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
          status: "sent"
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Unable to send quote.");
      setSuccess(true);
      setOpen(false);
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
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-white transition ${
          success
            ? "bg-emerald-600/90 hover:bg-emerald-500"
            : "bg-[#3B82F6] shadow-[0_0_25px_rgba(59,130,246,0.35)] hover:bg-blue-400"
        }`}
      >
        <span aria-hidden>{success ? "ok" : "send"}</span>
        {success ? "Quote sent" : "Send Quote"}
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
            className="w-full max-w-md rounded-3xl border border-[#D1B873]/25 bg-[#17191F] p-6 text-[#e1e2ec] shadow-[0_28px_80px_rgba(0,0,0,0.65)]"
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
    </>
  );
}
