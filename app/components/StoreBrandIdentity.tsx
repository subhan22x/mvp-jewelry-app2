"use client";

import { useEffect, useState } from "react";

type BrandMode = "logo" | "name" | "none";

type StoreBrand = {
  displayName: string;
  logoUrl: string | null;
  mode: BrandMode;
};

const FALLBACK_BRAND: StoreBrand = {
  displayName: "Flawless",
  logoUrl: "/landing/flawless-lettering-logo.png",
  mode: "logo"
};

function accountSlugFromPath(pathname: string) {
  const match = pathname.match(/^\/s\/([^/]+)\/design(?:\/|$)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export default function StoreBrandIdentity() {
  const [brand, setBrand] = useState<StoreBrand | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    if (process.env.NODE_ENV === "test") return () => controller.abort();

    const accountSlug = accountSlugFromPath(window.location.pathname);
    const query = accountSlug ? `?accountSlug=${encodeURIComponent(accountSlug)}` : "";
    setImageFailed(false);

    void fetch(`/api/design-brand${query}`, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) return FALLBACK_BRAND;
        const json = await response.json().catch(() => FALLBACK_BRAND);
        const nextBrand: StoreBrand = typeof json.displayName === "string" && json.displayName.trim()
          ? {
              displayName: json.displayName.trim(),
              logoUrl: typeof json.logoUrl === "string" ? json.logoUrl : null,
              mode: json.mode === "name" || json.mode === "none" ? json.mode : "logo"
            }
          : FALLBACK_BRAND;
        return nextBrand;
      })
      .then(nextBrand => {
        if (!controller.signal.aborted) setBrand(nextBrand);
      })
      .catch(() => {
        if (!controller.signal.aborted) setBrand(FALLBACK_BRAND);
      });

    return () => controller.abort();
  }, []);

  if (!brand) return <div className="mt-3 min-h-20" data-store-brand />;
  if (brand.mode === "none") return <div className="mt-1" data-store-brand data-brand-mode="none" />;

  const showLogo = brand.mode === "logo" && Boolean(brand.logoUrl) && !imageFailed;

  return (
    <div className="mt-3 flex min-h-20 items-center justify-center" data-store-brand data-brand-mode={brand.mode}>
      {showLogo ? (
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brand.logoUrl!}
            alt={`${brand.displayName} logo`}
            className="h-full w-full object-contain p-1.5"
            onError={() => setImageFailed(true)}
          />
        </div>
      ) : (
        <span
          className="max-w-full truncate text-center text-[15px] font-bold tracking-tight text-[var(--theme-heading)]"
          style={{ fontFamily: "var(--font-plus-jakarta), sans-serif" }}
        >
          {brand.displayName}
        </span>
      )}
    </div>
  );
}
