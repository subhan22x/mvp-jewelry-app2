"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";

type StorefrontShareCardProps = {
  accountSlug: string;
  isPublished: boolean;
};

const QR_COLORS = { dark: "#101114", light: "#ffffff" };

export default function StorefrontShareCard({ accountSlug, isPublished }: StorefrontShareCardProps) {
  const sharePath = `/s/${accountSlug}/design`;
  const [shareUrl, setShareUrl] = useState(sharePath);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setShareUrl(`${window.location.origin}${sharePath}`);
  }, [sharePath]);

  useEffect(() => {
    if (!shareUrl.startsWith("http")) return;
    let cancelled = false;
    QRCode.toDataURL(shareUrl, { width: 480, margin: 2, color: QR_COLORS })
      .then(dataUrl => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

  useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy your design wizard link:", shareUrl);
    }
  }

  async function downloadQr() {
    try {
      const dataUrl = await QRCode.toDataURL(shareUrl, { width: 1024, margin: 4, color: QR_COLORS });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${accountSlug}-design-wizard-qr.png`;
      link.click();
    } catch {
      // QR generation failed; the on-screen code (if any) is still available.
    }
  }

  return (
    <section className="rounded-xl border border-white/5 bg-[#17191F] p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f7bc5f]">Share</p>
        <h2 className="mt-3 text-2xl font-bold text-[#e1e2ec]">Your design wizard link</h2>
        <p className="mt-2 text-sm leading-6 text-[#c2c6d6]">
          Put this link in your Instagram bio or print the QR code for your counter. Every design and
          quote request made through it lands in your{" "}
          <Link href="/owner" className="font-semibold text-[#f7bc5f] hover:underline">
            Quotes dashboard
          </Link>
          .
        </p>
      </div>

      {!isPublished && (
        <div className="mt-4 rounded-lg border border-[#D1B873]/30 bg-[#2c2412] px-4 py-3 text-sm font-semibold text-[#F4D38A]">
          Your storefront is not published yet, so visitors will see an unavailable page. Publish it from{" "}
          <Link href="/owner/profile" className="underline">
            your profile
          </Link>{" "}
          before sharing this link.
        </div>
      )}

      <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <label htmlFor="storefront-share-url" className="text-xs font-bold uppercase tracking-[0.1em] text-[#8c909f]">
            Public link
          </label>
          <div className="mt-2 flex min-w-0 gap-2">
            <input
              id="storefront-share-url"
              type="text"
              readOnly
              value={shareUrl}
              onFocus={event => event.currentTarget.select()}
              className="h-11 min-w-0 flex-1 rounded-md border border-white/10 bg-[#101114] px-3 text-sm text-[#e1e2ec] outline-none focus:border-[#f7bc5f]/60"
            />
            <button
              type="button"
              onClick={copyLink}
              className={`h-11 flex-none rounded-md px-4 text-sm font-bold transition ${
                copied
                  ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                  : "bg-white text-[#101114] hover:bg-[#F4D38A]"
              }`}
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-[#8c909f]">
            This link stays the same as long as your store handle{" "}
            <span className="font-semibold text-[#c2c6d6]">{accountSlug}</span> does not change — safe to
            print on cards and flyers.
          </p>
        </div>

        <div className="flex flex-none flex-col items-center gap-3">
          <div className="rounded-lg bg-white p-2">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt={`QR code for ${shareUrl}`} className="h-40 w-40" />
            ) : (
              <div className="flex h-40 w-40 items-center justify-center text-xs font-semibold text-[#8c909f]">
                Generating…
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={downloadQr}
            disabled={!qrDataUrl}
            className="h-10 w-full rounded-md border border-[#3B4250] px-4 text-sm font-bold text-[#D7DBE8] transition hover:border-[#D1B873] hover:text-[#F4D38A] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Download QR (PNG)
          </button>
        </div>
      </div>
    </section>
  );
}
