"use client";

import { useEffect, useId, useState } from "react";

export type QuotePreviewMediaType = "image" | "model3d" | "video";

type ActiveMedia = QuotePreviewMediaType;

type Props = {
  imageUrl: string | null;
  previewMediaType?: QuotePreviewMediaType | null;
  modelUrl?: string | null;
  videoUrl?: string | null;
  alt: string;
  compact?: boolean;
  customerCard?: boolean;
};

export default function QuoteMediaViewer({
  imageUrl,
  previewMediaType = "image",
  modelUrl = null,
  videoUrl = null,
  alt,
  compact = false,
  customerCard = false
}: Props) {
  const [activeMedia, setActiveMedia] = useState<ActiveMedia>("image");
  const [viewerReady, setViewerReady] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const idPrefix = useId();

  const hasModel = previewMediaType === "model3d" && Boolean(modelUrl);
  const hasVideo = previewMediaType === "video" && Boolean(videoUrl);
  const secondaryMedia: Exclude<ActiveMedia, "image"> | null = hasModel
    ? "model3d"
    : hasVideo
      ? "video"
      : null;
  const visibleMedia = activeMedia === secondaryMedia ? activeMedia : "image";

  useEffect(() => {
    if (!hasModel || visibleMedia !== "model3d" || viewerReady) return;

    let cancelled = false;
    import("@google/model-viewer")
      .then(() => {
        if (!cancelled) setViewerReady(true);
      })
      .catch(() => {
        if (!cancelled) setViewerError("The 3D viewer could not be loaded in this browser.");
      });

    return () => {
      cancelled = true;
    };
  }, [hasModel, viewerReady, visibleMedia]);

  const imageTabId = `${idPrefix}-image-tab`;
  const imagePanelId = `${idPrefix}-image-panel`;
  const secondaryTabId = `${idPrefix}-${secondaryMedia ?? "media"}-tab`;
  const secondaryPanelId = `${idPrefix}-${secondaryMedia ?? "media"}-panel`;
  const mediaHeightClass = customerCard
    ? "aspect-[6/5]"
    : compact
      ? "h-[clamp(160px,26dvh,240px)] md:h-[min(58dvh,540px)]"
      : "aspect-square";

  return (
    <section
      className={
        customerCard
          ? "overflow-hidden bg-[#2c2c2b]"
          : `${compact ? "rounded-2xl" : "rounded-[1.75rem]"} overflow-hidden border border-[#332d26] bg-[#12110f] shadow-[0_28px_80px_rgba(0,0,0,0.38)]`
      }
    >
      {secondaryMedia ? (
        <div role="tablist" aria-label="Quote preview media" className="flex border-b border-[#332d26] bg-[#191611] p-2">
          <button
            id={imageTabId}
            type="button"
            role="tab"
            aria-selected={visibleMedia === "image"}
            aria-controls={imagePanelId}
            onClick={() => setActiveMedia("image")}
            className={`h-11 flex-1 rounded-2xl text-sm font-black transition ${
              visibleMedia === "image" ? "bg-[#d3a84f] text-black" : "text-[#b9b0a3] hover:bg-white/5"
            }`}
          >
            Image
          </button>
          <button
            id={secondaryTabId}
            type="button"
            role="tab"
            aria-selected={visibleMedia === secondaryMedia}
            aria-controls={secondaryPanelId}
            onClick={() => setActiveMedia(secondaryMedia)}
            className={`h-11 flex-1 rounded-2xl text-sm font-black transition ${
              visibleMedia === secondaryMedia ? "bg-[#d3a84f] text-black" : "text-[#b9b0a3] hover:bg-white/5"
            }`}
          >
            {secondaryMedia === "model3d" ? "3D" : "Video"}
          </button>
        </div>
      ) : null}

      <div className="bg-black">
        {visibleMedia === "image" ? (
          <div
            id={imagePanelId}
            role={secondaryMedia ? "tabpanel" : undefined}
            aria-labelledby={secondaryMedia ? imageTabId : undefined}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={alt} className={`${mediaHeightClass} w-full object-cover`} />
            ) : (
              <div className={`${mediaHeightClass} flex w-full items-center justify-center px-6 text-center text-sm text-[#8c8377]`}>
                No quoted image is available.
              </div>
            )}
          </div>
        ) : null}

        {visibleMedia === "model3d" && hasModel ? (
          <div id={secondaryPanelId} role="tabpanel" aria-labelledby={secondaryTabId}>
            {viewerReady ? (
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
                style={{
                  width: "100%",
                  height: customerCard ? undefined : "min(72dvh, 620px)",
                  aspectRatio: customerCard ? "6 / 5" : undefined,
                  background: "#000"
                }}
              >
                <button
                  slot="ar-button"
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#d3a84f] px-5 py-3 text-sm font-black text-black shadow-lg"
                >
                  View in your space
                </button>
              </model-viewer>
            ) : viewerError ? (
              <div className={`${customerCard ? "aspect-[6/5]" : "h-[min(72dvh,620px)]"} flex items-center justify-center px-6 text-center text-sm text-red-200`}>
                {viewerError}
              </div>
            ) : (
              <div className={`${customerCard ? "aspect-[6/5]" : "h-[min(72dvh,620px)]"} flex items-center justify-center px-6 text-center text-sm text-[#8c8377]`}>
                Loading 3D viewer...
              </div>
            )}
          </div>
        ) : null}

        {visibleMedia === "video" && hasVideo ? (
          <div id={secondaryPanelId} role="tabpanel" aria-labelledby={secondaryTabId}>
            {videoError ? (
              <div className={`flex ${customerCard ? "aspect-[6/5]" : "aspect-square"} w-full items-center justify-center px-6 text-center text-sm text-red-200`}>
                {videoError}
              </div>
            ) : (
              <video
                src={videoUrl ?? undefined}
                poster={imageUrl ?? undefined}
                controls
                playsInline
                preload="metadata"
                aria-label={`${alt} video preview`}
                onError={() => setVideoError("The quote video could not be loaded in this browser.")}
                className={`${customerCard ? "aspect-[6/5]" : "aspect-square"} w-full bg-black object-contain`}
              >
                Your browser does not support video playback.
              </video>
            )}
          </div>
        ) : null}
      </div>

      {viewerError && visibleMedia === "model3d" && viewerReady ? (
        <div role="alert" className="border-t border-red-400/30 bg-red-500/10 px-4 py-3 text-xs text-red-100">
          {viewerError}
        </div>
      ) : null}

      {!compact && !customerCard ? (
        <div className="border-t border-[#332d26] px-4 py-3 text-xs leading-5 text-[#8c8377]">
          {secondaryMedia === "model3d"
            ? "Switch between the quoted image and an interactive 3D preview. On a phone, use View in your space for AR."
            : secondaryMedia === "video"
              ? "Switch between the quoted image and video preview."
              : "This quote includes the selected design image."}
        </div>
      ) : null}
    </section>
  );
}
