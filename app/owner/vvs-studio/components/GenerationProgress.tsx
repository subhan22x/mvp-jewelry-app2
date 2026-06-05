"use client";

import { useEffect, useState } from "react";

type Props = {
  kind: "image" | "video";
  thumbnailUrl?: string;
  stage?: string;
};

const IMAGE_STEPS = [
  "Preparing source pendant",
  "Refining jewelry geometry",
  "Styling pendant scene",
  "Creating final camera angle",
];

const VIDEO_STEPS = [
  "Creating final camera angle",
  "Submitting motion reel",
  "Animating light reflections",
  "Saving final video",
];

const STAGE_INDEX: Record<string, number> = {
  source_refine: 1,
  style_composite: 2,
  last_shot: 3,
  video: 1,
  save_video: 3,
  complete: 3,
};

export default function GenerationProgress({ kind, thumbnailUrl, stage }: Props) {
  const steps = kind === "image" ? IMAGE_STEPS : VIDEO_STEPS;
  const [progress, setProgress] = useState(0);
  const activeStep = Math.min(steps.length - 1, stage && stage in STAGE_INDEX ? STAGE_INDEX[stage] : Math.floor((progress / 100) * steps.length));

  useEffect(() => {
    const totalMs = kind === "image" ? 18000 : 45000;
    const interval = 150;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      setProgress(Math.min(92, (elapsed / totalMs) * 100));
    }, interval);

    return () => clearInterval(timer);
  }, [kind]);

  return (
    <div
      className="flex flex-col items-center"
      style={{ padding: "28px 22px 28px", gap: 0 }}
    >
      <div style={{ flex: 1 }} />

      {kind === "video" && thumbnailUrl ? (
        <div
          style={{
            position: "relative",
            width: 110,
            height: 110,
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid #35353d",
            background: "#1e1e24",
            marginBottom: 28,
            flexShrink: 0,
          }}
        >
          <img src={thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(10,10,12,0.65)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ position: "relative", width: 44, height: 44 }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "2.5px solid #35353d",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "2.5px solid transparent",
                  borderTopColor: "#D4A853",
                  animation: "vvs-spin 1s linear infinite",
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ position: "relative", width: 88, height: 88, marginBottom: 28 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "3px solid #35353d",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "3px solid transparent",
              borderTopColor: "#D4A853",
              animation: "vvs-spin 1s linear infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 28, color: "#D4A853" }}>✦</span>
          </div>
        </div>
      )}

      <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 24, fontWeight: 700, color: "#eaeaf0", textAlign: "center" }}>
        {kind === "image" ? "Generating..." : "Generating Video..."}
      </span>
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#606068", marginTop: 6, textAlign: "center" }}>
        {kind === "image" ? "Building the pendant scene" : "Creating your motion reel"}
      </span>

      <div style={{ width: "100%", marginTop: 28, display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ height: 4, background: "#35353d", borderRadius: 2, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "#D4A853",
              borderRadius: 2,
              transition: "width 0.15s linear",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "#606068", fontFamily: "'DM Sans', sans-serif" }}>Processing</span>
          <span style={{ fontSize: 11, color: "#D4A853", fontFamily: "'DM Sans', sans-serif" }}>{Math.round(progress)}%</span>
        </div>
      </div>

      <div style={{ width: "100%", marginTop: 24, display: "flex", flexDirection: "column", gap: 13 }}>
        {steps.map((label, i) => {
          const done = i < activeStep;
          const active = i === activeStep;
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: done ? "#D4A853" : active ? "#D4A85333" : "#35353d",
                  border: active ? "2px solid #D4A853" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {done && <span style={{ fontSize: 10, color: "#000" }}>✓</span>}
                {active && (
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#D4A853",
                      animation: "vvs-pulse 1.4s ease-in-out infinite",
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: active ? "#D4A853" : done ? "#eaeaf0" : "#606068",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ flex: 1, minHeight: 24 }} />
      <span style={{ fontSize: 11, color: "#606068", fontFamily: "'DM Sans', sans-serif", textAlign: "center" }}>
        {kind === "image" ? "This can take a few minutes with provider processing" : "This can take several minutes depending on queue time"}
      </span>
    </div>
  );
}
