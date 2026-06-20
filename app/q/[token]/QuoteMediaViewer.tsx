"use client";

import { useEffect, useState } from "react";

type Props = {
  imageUrl: string | null;
  modelUrl: string | null;
  alt: string;
};

export default function QuoteMediaViewer({ imageUrl, modelUrl, alt }: Props) {
  const [activeTab, setActiveTab] = useState<"image" | "model">("image");
  const [viewerReady, setViewerReady] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const hasModel = Boolean(modelUrl);

  useEffect(() => {
    if (!hasModel) return;

    let cancelled = false;
    import("@google/model-viewer")
      .then(() => {
        if (!cancelled) setViewerReady(true);
      })
      .catch(() => {
        if (!cancelled) setViewerReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasModel]);

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-[#332d26] bg-[#12110f] shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
      <div className="flex border-b border-[#332d26] bg-[#191611] p-2">
        <button
          type="button"
          onClick={() => setActiveTab("image")}
          className={`h-11 flex-1 rounded-2xl text-sm font-black transition ${
            activeTab === "image" ? "bg-[#d3a84f] text-black" : "text-[#b9b0a3] hover:bg-white/5"
          }`}
        >
          Image
        </button>
        <button
          type="button"
          onClick={() => {
            if (hasModel) setActiveTab("model");
          }}
          disabled={!hasModel}
          className={`h-11 flex-1 rounded-2xl text-sm font-black transition ${
            activeTab === "model" ? "bg-[#d3a84f] text-black" : "text-[#b9b0a3] hover:bg-white/5"
          } disabled:cursor-not-allowed disabled:opacity-45`}
        >
          3D
        </button>
      </div>

      <div className="bg-black">
        {activeTab === "image" && (
          imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={alt} className="aspect-square w-full object-cover" />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center px-6 text-center text-sm text-[#8c8377]">
              No quoted image is available.
            </div>
          )
        )}

        {activeTab === "model" && hasModel && (
          viewerReady ? (
            <model-viewer
              src={modelUrl ?? undefined}
              poster={imageUrl ?? undefined}
              alt={`${alt} in 3D`}
              reveal="auto"
              camera-controls
              auto-rotate
              touch-action="pan-y"
              ar
              ar-modes="webxr scene-viewer quick-look"
              shadow-intensity="1"
              onLoad={() => setViewerError(null)}
              onError={() => setViewerError("The 3D model could not be loaded in this browser.")}
              style={{ width: "100%", height: "min(72dvh, 620px)", background: "#000" }}
            >
              <button
                slot="ar-button"
                className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#d3a84f] px-5 py-3 text-sm font-black text-black shadow-lg"
              >
                View in your space
              </button>
            </model-viewer>
          ) : (
            <div className="flex h-[min(72dvh,620px)] items-center justify-center px-6 text-center text-sm text-[#8c8377]">
              Loading 3D viewer...
            </div>
          )
        )}
      </div>

      {viewerError && activeTab === "model" && (
        <div className="border-t border-red-400/30 bg-red-500/10 px-4 py-3 text-xs text-red-100">
          {viewerError}
        </div>
      )}

      <div className="border-t border-[#332d26] px-4 py-3 text-xs leading-5 text-[#8c8377]">
        {hasModel
          ? "Switch between the quoted image and an interactive 3D preview. On a phone, use View in your space for AR."
          : "3D preview is not available for this quote yet."}
      </div>
    </section>
  );
}
