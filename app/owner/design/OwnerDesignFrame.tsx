"use client";
import { useEffect, useRef } from "react";

export default function OwnerDesignFrame() {
  const frame = useRef<HTMLIFrameElement>(null);
  const applyScrollSpace = () => {
    const doc = frame.current?.contentDocument;
    if (!doc?.body) return;
    const banner = document.querySelector("[data-signup-credit-banner]");
    const space = banner ? `${Math.ceil(banner.getBoundingClientRect().height) + 24}px` : "";
    doc.body.style.paddingBottom = space;
    doc.documentElement.style.scrollPaddingBottom = space;
  };
  useEffect(() => {
    let currentBanner: Element | null | undefined;
    const resizeObserver = new ResizeObserver(applyScrollSpace);
    const syncBanner = () => {
      const banner = document.querySelector("[data-signup-credit-banner]");
      if (banner === currentBanner) return;
      resizeObserver.disconnect();
      currentBanner = banner;
      if (banner) resizeObserver.observe(banner);
      applyScrollSpace();
    };
    syncBanner();
    const mutationObserver = new MutationObserver(syncBanner);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    return () => { mutationObserver.disconnect(); resizeObserver.disconnect(); };
  }, []);
  return <iframe ref={frame} title="VVS Design" src="/design" onLoad={applyScrollSpace} className="h-full w-full border-0" />;
}
