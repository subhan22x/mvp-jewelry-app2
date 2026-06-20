"use client";

import { useState } from "react";
import { buildQuoteMessage } from "@/src/lib/quotes/quote-message";

type Props = {
  customerPhone: string;
  customerName: string;
  quoteUrl: string;
  quotedPriceCents: number | null;
  estimatedDelivery: string | null;
  quoteMaterial: string | null;
  quoteMaterialKarat: string | null;
  quoteStoneType: string | null;
  quoteNotes: string | null;
};

export default function QuoteShareActions({
  customerPhone,
  customerName,
  quoteUrl,
  quotedPriceCents,
  estimatedDelivery,
  quoteMaterial,
  quoteMaterialKarat,
  quoteStoneType,
  quoteNotes
}: Props) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const message = buildQuoteMessage({
    customerName,
    quotedPriceCents,
    estimatedDelivery,
    material: quoteMaterial,
    materialKarat: quoteMaterialKarat,
    stoneType: quoteStoneType,
    notes: quoteNotes,
    quoteUrl
  });
  const smsHref = `sms:${customerPhone}?&body=${encodeURIComponent(message)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(message);
      setFeedback("Quote message copied.");
    } catch {
      setFeedback("Unable to copy automatically.");
    }
  }

  async function copyPhone() {
    if (!customerPhone) return setFeedback("No customer phone number is available.");
    try {
      await navigator.clipboard.writeText(customerPhone);
      setFeedback("Phone number copied.");
    } catch {
      setFeedback("Unable to copy the phone number automatically.");
    }
  }

  async function shareMessage() {
    if (!navigator.share) return setFeedback("Native sharing is not available on this device. Copy the message instead.");
    try {
      await navigator.share({ title: "Customer quote", text: message });
      setFeedback("Share sheet opened.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setFeedback("Unable to open the share sheet. Copy the message instead.");
    }
  }

  return (
    <div className="mt-6 grid gap-3">
      <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0f1015]">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-black/25 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8c909f]">To</p>
            <p className="mt-1 break-words text-sm font-semibold text-white">{customerPhone || "No phone number"}</p>
          </div>
          <button type="button" onClick={copyPhone} disabled={!customerPhone} className="rounded-full border border-[#D1B873]/25 bg-[#D1B873]/10 px-3 py-2 text-xs font-semibold text-[#f3d98f] disabled:opacity-45">Copy Phone Number</button>
        </div>
        <div className="grid gap-3 px-4 py-4">
          <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-6 text-white/80">{message}</pre>
          <button type="button" onClick={copyLink} className="justify-self-end rounded-full border border-[#D1B873]/25 bg-[#D1B873]/10 px-3 py-2 text-xs font-semibold text-[#f3d98f]">Copy Message</button>
        </div>
      </div>
      <a href={smsHref} className="rounded-2xl bg-[#D1B873] px-5 py-3 text-center text-sm font-semibold text-[#17120a] hover:bg-[#e6cb82]">Send Message</a>
      <button type="button" onClick={shareMessage} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 hover:bg-white/10">More Share Options</button>
      <a href={quoteUrl} target="_blank" rel="noopener noreferrer" className="break-all rounded-2xl border border-[#D1B873]/25 bg-[#D1B873]/10 px-4 py-3 text-center text-sm font-semibold text-[#f3d98f]">{quoteUrl}</a>
      {feedback ? <p className="text-center text-xs text-[#D1B873]">{feedback}</p> : null}
    </div>
  );
}
