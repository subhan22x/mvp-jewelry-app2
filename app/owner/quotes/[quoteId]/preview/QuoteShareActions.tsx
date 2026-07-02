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

  return (
    <div className="mt-3 grid gap-2 md:mt-6 md:gap-3">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f1015]">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-black/25 px-3 py-2.5 md:gap-3 md:px-4 md:py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8c909f]">To</p>
            <p className="mt-1 break-words text-sm font-semibold text-white">{customerPhone || "No phone number"}</p>
          </div>
          <button type="button" onClick={copyPhone} disabled={!customerPhone} className="rounded-full border border-[#D1B873]/25 bg-[#D1B873]/10 px-3 py-1.5 text-[11px] font-semibold text-[#f3d98f] disabled:opacity-45 md:py-2 md:text-xs">Copy Phone Number</button>
        </div>
        <div className="grid gap-2 px-3 py-3 md:gap-3 md:px-4 md:py-4">
          <pre className="max-h-28 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-5 text-white/80 md:max-h-72 md:text-sm md:leading-6">{message}</pre>
          <button type="button" onClick={copyLink} className="justify-self-end rounded-full border border-[#D1B873]/25 bg-[#D1B873]/10 px-3 py-1.5 text-[11px] font-semibold text-[#f3d98f] md:py-2 md:text-xs">Copy Message</button>
        </div>
      </div>
      <a href={smsHref} className="rounded-2xl bg-[#D1B873] px-5 py-2.5 text-center text-sm font-semibold text-[#17120a] hover:bg-[#e6cb82] md:py-3">Send Message</a>
      {feedback ? <p className="text-center text-xs text-[#D1B873]">{feedback}</p> : null}
    </div>
  );
}
