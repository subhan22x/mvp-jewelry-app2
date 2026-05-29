"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MobileOwnerNav from "../MobileOwnerNav";
import StepProgress from "./components/StepProgress";
import AngleUploadCard from "./components/AngleUploadCard";
import GenerationProgress from "./components/GenerationProgress";
import StudioResultCard from "./components/StudioResultCard";
import VideoResultCard from "./components/VideoResultCard";
import type {
  VvsWizardState,
  VvsWizardStep,
  VvsVisualStyle,
  VvsPieceType,
  VvsMetalType,
  VvsGoldColor,
  VvsStoneSetting,
  VvsMood,
  VvsAspectRatio,
  VvsVideoDurationSeconds,
  VvsUploadedFile,
} from "./types";
import { DEFAULT_STATE } from "./types";

// ── design tokens ────────────────────────────────────────────────
const G = "#D4A853";
const BG = "#16161a";
const PANEL = "#1e1e24";
const BD = "#35353d";
const TX = "#eaeaf0";
const SOFT = "#c0c0c8";
const DIM = "#606068";
const MOCK_VVS_GENERATION = true;
const MOCK_VIDEO_URL = "/vvs-studio/style-videos/style-1.mp4";

// ── reducer ──────────────────────────────────────────────────────
type Action =
  | { type: "SET_STEP"; step: VvsWizardStep }
  | { type: "SET_UPLOAD"; angle: "top" | "left" | "right"; upload: VvsUploadedFile }
  | { type: "REMOVE_UPLOAD"; angle: "top" | "left" | "right" }
  | { type: "SET_FIELD"; field: string; value: unknown }
  | { type: "SET_GENERATED_IMAGE"; url: string; generationId?: string }
  | { type: "SET_GENERATED_VIDEO"; url: string; videoGenerationId?: string }
  | { type: "SET_ERROR"; error: string }
  | { type: "RESET" };

function reducer(state: VvsWizardState, action: Action): VvsWizardState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step, error: undefined };
    case "SET_UPLOAD":
      return { ...state, uploads: { ...state.uploads, [action.angle]: action.upload } };
    case "REMOVE_UPLOAD": {
      const uploads = { ...state.uploads };
      delete uploads[action.angle];
      return { ...state, uploads };
    }
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_GENERATED_IMAGE":
      return { ...state, generatedImageUrl: action.url, imageGenerationId: action.generationId, step: "imageResult" };
    case "SET_GENERATED_VIDEO":
      return { ...state, generatedVideoUrl: action.url, videoGenerationId: action.videoGenerationId, step: "videoResult" };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "RESET":
      return { ...DEFAULT_STATE };
    default:
      return state;
  }
}

// ── helpers ──────────────────────────────────────────────────────
const STYLE_LABELS: { value: VvsVisualStyle; label: string; videoSrc?: string }[] = [
  { value: "dark", label: "Dark", videoSrc: "/vvs-studio/style-videos/style-1.mp4" },
  { value: "marble", label: "Marble", videoSrc: "/vvs-studio/style-videos/style-2.mp4" },
  { value: "street", label: "Street", videoSrc: "/vvs-studio/style-videos/style-3.mp4" },
  { value: "velvet", label: "Velvet", videoSrc: "/vvs-studio/style-videos/style-4.mp4" },
  { value: "ice", label: "Ice" },
];

const PIECE_TYPES: { value: VvsPieceType; label: string }[] = [
  { value: "pendant", label: "Pendant" },
  { value: "ring", label: "Ring" },
  { value: "chainz", label: "Chainz" },
  { value: "grills", label: "Grills" },
  { value: "band", label: "Band" },
];

const METAL_TYPES: { value: VvsMetalType; label: string }[] = [
  { value: "10k_gold", label: "10K Gold" },
  { value: "14k_gold", label: "14K Gold" },
  { value: "18k_gold", label: "18K Gold" },
  { value: "silver", label: "Silver" },
];

const GOLD_COLORS: { value: VvsGoldColor; label: string }[] = [
  { value: "yellow_gold", label: "Yellow Gold" },
  { value: "white_gold", label: "White Gold" },
  { value: "rose_gold", label: "Rose Gold" },
];

const STONE_SETTINGS: { value: VvsStoneSetting; label: string }[] = [
  { value: "micro_pave", label: "Micro Pavé" },
  { value: "flooded", label: "Flooded" },
  { value: "baguette", label: "Baguette" },
  { value: "invisible", label: "Invisible" },
];

const MOODS: { value: VvsMood; label: string }[] = [
  { value: "luxury", label: "Luxury" },
  { value: "street", label: "Street" },
  { value: "editorial", label: "Editorial" },
  { value: "minimal", label: "Minimal" },
];

const RATIOS: { value: VvsAspectRatio; label: string; sub: string; pw: number; ph: number }[] = [
  { value: "story", label: "Story", sub: "9:16  Reels / TikTok", pw: 29, ph: 52 },
];

const VIDEO_DURATIONS: { value: VvsVideoDurationSeconds; label: string; sub: string }[] = [
  { value: 6, label: "6 sec", sub: "Standard reel" },
  { value: 10, label: "10 sec", sub: "Longer showcase" },
];

// ── Pill chip ─────────────────────────────────────────────────────
function Chip({
  label,
  active,
  small,
  onClick,
}: {
  label: string;
  active: boolean;
  small?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: small ? "3px 9px" : "5px 13px",
        borderRadius: 20,
        flexShrink: 0,
        border: `1.5px solid ${active ? G : BD}`,
        background: active ? G + "22" : BG,
        cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: small ? 11 : 13,
        color: active ? G : SOFT,
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      {label}
    </button>
  );
}

// ── StyleCard ─────────────────────────────────────────────────────
function StyleCard({ label, videoSrc, active, onClick }: { label: string; videoSrc?: string; active: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ flex: "0 0 108px", display: "flex", flexDirection: "column", cursor: "pointer" }}>
      <div
        style={{
          height: 170,
          border: `2px solid ${active ? G : BD}`,
          borderRadius: 8,
          background: PANEL,
          position: "relative",
          overflow: "hidden",
          transition: "border-color 0.15s",
        }}
      >
        {videoSrc ? (
          <video
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: active ? 0.95 : 0.72,
            }}
          />
        ) : (
          <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
            <defs>
              <pattern id={`sc-${label}`} x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="14" stroke="#252530" strokeWidth="1.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#sc-${label})`} />
          </svg>
        )}
        {videoSrc && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background: active
                ? "linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.28))"
                : "linear-gradient(180deg, rgba(0,0,0,0.22), rgba(0,0,0,0.52))",
            }}
          />
        )}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: active ? G + "55" : BD + "88",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 9, marginLeft: 2, color: active ? G : DIM }}>▶</span>
          </div>
        </div>
        {active && (
          <div
            style={{
              position: "absolute",
              top: 5,
              right: 5,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: G,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 8, color: "#000" }}>✓</span>
          </div>
        )}
        <span
          style={{
            position: "absolute",
            left: 9,
            right: 9,
            bottom: 9,
            fontSize: 12,
            color: active ? G : DIM,
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

// ── RatioCard ─────────────────────────────────────────────────────
function RatioCard({
  label,
  sub,
  pw,
  ph,
  active,
  onClick,
}: {
  label: string;
  sub: string;
  pw: number;
  ph: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "10px 6px",
        cursor: "default",
        borderRadius: 9,
        border: `1.5px solid ${active ? G : BD}`,
        background: active ? G + "12" : BG,
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 52 }}>
        <div
          style={{
            width: pw,
            height: ph,
            border: `2px solid ${active ? G : "#555"}`,
            borderRadius: 3,
            background: active ? G + "22" : PANEL,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {active && (
            <div style={{ width: Math.round(pw * 0.4), height: Math.round(ph * 0.4), borderRadius: 2, background: G + "55" }} />
          )}
        </div>
      </div>
      <span style={{ fontSize: 13, color: active ? G : SOFT, fontWeight: active ? 600 : 400, textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
      <span style={{ fontSize: 10, color: DIM, textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>{sub}</span>
    </button>
  );
}

// ── Primary button ────────────────────────────────────────────────
function PrimaryBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 48,
        width: "100%",
        background: disabled ? "#35353d" : G + "1a",
        border: `1.5px solid ${disabled ? "#35353d" : G}`,
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 14,
        fontWeight: 600,
        color: disabled ? DIM : G,
        transition: "background 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function SecondaryBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 44,
        flex: 1,
        border: `1.5px solid ${BD}`,
        borderRadius: 8,
        background: PANEL,
        cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 14,
        color: SOFT,
      }}
    >
      {label}
    </button>
  );
}

function FieldLabel({ label, optional }: { label: string; optional?: boolean }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: DIM, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.05em" }}>
      <span>{label}</span>
      {optional && (
        <span
          style={{
            borderRadius: 999,
            border: `1px solid ${BD}`,
            padding: "1px 5px",
            fontSize: 8,
            lineHeight: 1.2,
            letterSpacing: "0.04em",
            color: "#8f8f98",
          }}
        >
          OPTIONAL
        </span>
      )}
    </span>
  );
}

function FInput({ label, placeholder, value, onChange, optional }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; optional?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
      <FieldLabel label={label} optional={optional} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          height: 32,
          width: "100%",
          boxSizing: "border-box",
          border: `1px solid ${BD}`,
          borderRadius: 5,
          background: BG,
          padding: "0 9px",
          color: TX,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          outline: "none",
        }}
      />
    </div>
  );
}

function FSelect<T extends string>({ label, value, options, onChange, optional }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; optional?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
      <FieldLabel label={label} optional={optional} />
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        style={{
          height: 32,
          width: "100%",
          boxSizing: "border-box",
          border: `1px solid ${BD}`,
          borderRadius: 5,
          background: BG,
          padding: "0 9px",
          color: TX,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          outline: "none",
          cursor: "pointer",
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── STEP_INDEX maps step name to progress bar index ───────────────
const STEP_INDEX: Record<VvsWizardStep, number> = {
  capture: 0,
  details: 1,
  theme: 2,
  generatingImage: 3,
  imageResult: 3,
  generatingVideo: 4,
  videoResult: 4,
};

// ── Logo component ────────────────────────────────────────────────
function VvsLogo() {
  return (
    <img
      src="/vvs-studio/logo.png"
      alt="VVS Studio"
      style={{ height: 28, objectFit: "contain", mixBlendMode: "lighten", opacity: 0.92 }}
    />
  );
}

// ── Wizard header ─────────────────────────────────────────────────
function WizardHeader({ step, onHome }: { step: VvsWizardStep; onHome: () => void }) {
  return (
    <header
      className="vvs-wizard-header"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        background: BG,
        borderBottom: `1px solid ${BD}`,
        padding: "12px 18px 10px",
        boxShadow: "0 10px 28px rgba(0,0,0,0.22)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <MobileOwnerNav active="VVS Studio" />
        <VvsLogo />
        <button
          type="button"
          onClick={onHome}
          aria-label="Go home"
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            border: `1.5px solid ${BD}`,
            background: PANEL,
            color: G,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
            <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
        <StepProgress current={STEP_INDEX[step]} />
      </div>
    </header>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────
export default function VvsStudioWizard() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);
  const [mounted, setMounted] = useState(false);

  const setStep = useCallback((step: VvsWizardStep) => dispatch({ type: "SET_STEP", step }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleHome = useCallback(() => {
    if (window.confirm("Your current VVS Studio draft will be lost if you leave. Go back home?")) {
      router.push("/owner");
    }
  }, [router]);

  function cancelPending() {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  }

  async function pollStatus(
    url: string,
    signal: AbortSignal,
    onData: (data: Record<string, unknown>) => boolean
  ) {
    while (!signal.aborted) {
      await new Promise(r => setTimeout(r, 2500));
      if (signal.aborted) break;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`Poll failed: HTTP ${res.status}`);
      const data: Record<string, unknown> = await res.json();
      if (onData(data)) return;
    }
  }

  async function mockDelay(signal: AbortSignal, durationMs = 1800) {
    await new Promise<void>((resolve) => {
      const timeout = window.setTimeout(resolve, durationMs);
      signal.addEventListener("abort", () => {
        window.clearTimeout(timeout);
        resolve();
      }, { once: true });
    });
  }

  function getMockImageUrl() {
    return state.uploads.top?.previewUrl
      ?? state.uploads.left?.previewUrl
      ?? state.uploads.right?.previewUrl
      ?? "/vvs-studio/guide-top.jpg";
  }

  async function runImageGeneration(existingShootId?: string) {
    const signal = cancelPending();
    setStep("generatingImage");
    try {
      if (MOCK_VVS_GENERATION) {
        await mockDelay(signal);
        if (signal.aborted) return;
        dispatch({ type: "SET_FIELD", field: "shootId", value: existingShootId ?? "mock-vvs-shoot" });
        dispatch({
          type: "SET_GENERATED_IMAGE",
          url: getMockImageUrl(),
          generationId: "mock-vvs-image-generation",
        });
        return;
      }

      let shootId = existingShootId;

      if (!shootId) {
        const res = await fetch("/api/owner/vvs-studio/shoots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pieceType: state.pieceType, visualStyle: state.visualStyle }),
          signal,
        });
        if (!res.ok) throw new Error("Failed to create shoot.");
        ({ shootId } = await res.json() as { shootId: string });
        dispatch({ type: "SET_FIELD", field: "shootId", value: shootId });

        // Upload photos concurrently
        await Promise.all(
          (["top", "left", "right"] as const)
            .filter(a => state.uploads[a]?.localFile)
            .map(async (angle) => {
              const fd = new FormData();
              fd.append("file", state.uploads[angle]!.localFile!);
              fd.append("angle", angle);
              const uploadRes = await fetch(`/api/owner/vvs-studio/shoots/${shootId}/uploads`, { method: "POST", body: fd, signal });
              if (!uploadRes.ok) throw new Error(`Failed to upload ${angle} photo.`);
            })
        );

        // Persist shoot details
        await fetch(`/api/owner/vvs-studio/shoots/${shootId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mood: state.mood,
            aspectRatio: state.aspectRatio,
            videoDurationSeconds: state.videoDurationSeconds,
            metalType: state.metalType,
            goldColor: state.goldColor,
            engravingText: state.engravingText,
            priceLabel: state.price,
            stoneSetting: state.stoneSetting,
          }),
          signal,
        });
      }

      // Kick off generation
      const genRes = await fetch(`/api/owner/vvs-studio/shoots/${shootId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: state.imageProvider, modelId: state.imageModelId }),
        signal,
      });
      if (!genRes.ok) {
        const { error } = await genRes.json() as { error?: string };
        throw new Error(error ?? "Failed to start generation.");
      }
      const { generationId } = await genRes.json() as { generationId: string };
      dispatch({ type: "SET_FIELD", field: "imageGenerationId", value: generationId });

      // Poll until done
      await pollStatus(`/api/owner/vvs-studio/generations/${generationId}`, signal, (data) => {
        if (data.status === "succeeded") {
          dispatch({ type: "SET_GENERATED_IMAGE", url: data.imageUrl as string, generationId });
          return true;
        }
        if (data.status === "failed") throw new Error((data.error as string) || "Image generation failed.");
        return false;
      });
    } catch (err) {
      if (signal.aborted) return;
      dispatch({ type: "SET_ERROR", error: err instanceof Error ? err.message : "Generation failed." });
      setStep("theme");
    }
  }

  async function runVideoGeneration() {
    const signal = cancelPending();
    const shootId = state.shootId;
    const imageGenerationId = state.imageGenerationId;
    if (!MOCK_VVS_GENERATION && (!shootId || !imageGenerationId)) return;

    setStep("generatingVideo");
    try {
      if (MOCK_VVS_GENERATION) {
        await mockDelay(signal);
        if (signal.aborted) return;
        dispatch({
          type: "SET_GENERATED_VIDEO",
          url: MOCK_VIDEO_URL,
          videoGenerationId: "mock-vvs-video-generation",
        });
        return;
      }

      if (!shootId || !imageGenerationId) return;

      // Finalize the chosen image
      await fetch(`/api/owner/vvs-studio/shoots/${shootId}/finalize-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId: imageGenerationId }),
        signal,
      });

      // Start video generation
      const vidRes = await fetch(`/api/owner/vvs-studio/shoots/${shootId}/video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceImageGenerationId: imageGenerationId }),
        signal,
      });
      if (!vidRes.ok) {
        const { error } = await vidRes.json() as { error?: string };
        throw new Error(error ?? "Failed to start video generation.");
      }
      const { videoGenerationId } = await vidRes.json() as { videoGenerationId: string };

      // Poll until done
      await pollStatus(`/api/owner/vvs-studio/videos/${videoGenerationId}`, signal, (data) => {
        if (data.status === "succeeded") {
          dispatch({ type: "SET_GENERATED_VIDEO", url: data.videoUrl as string, videoGenerationId });
          return true;
        }
        if (data.status === "failed") throw new Error((data.error as string) || "Video generation failed.");
        return false;
      });
    } catch (err) {
      if (signal.aborted) return;
      dispatch({ type: "SET_ERROR", error: err instanceof Error ? err.message : "Video generation failed." });
      setStep("imageResult");
    }
  }

  async function finishAtImage() {
    if (MOCK_VVS_GENERATION) {
      reset();
      return;
    }

    const shootId = state.shootId;
    const generationId = state.imageGenerationId;
    if (shootId && generationId) {
      await fetch(`/api/owner/vvs-studio/shoots/${shootId}/finalize-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId }),
      }).catch(() => undefined);
    }
    reset();
  }

  function handleFile(angle: "top" | "left" | "right", file: File) {
    const existing = state.uploads[angle];
    if (existing?.previewUrl) URL.revokeObjectURL(existing.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    dispatch({
      type: "SET_UPLOAD",
      angle,
      upload: { localFile: file, previewUrl, status: "local" },
    });
  }

  function handleRemove(angle: "top" | "left" | "right") {
    const existing = state.uploads[angle];
    if (existing?.previewUrl) URL.revokeObjectURL(existing.previewUrl);
    dispatch({ type: "REMOVE_UPLOAD", angle });
  }

  const hasUpload = Boolean(state.uploads.top || state.uploads.left || state.uploads.right);
  const canProceedCapture = hasUpload && Boolean(state.visualStyle);
  const canProceedDetails = Boolean(state.pieceType);
  const canGenerate = Boolean(state.mood) && Boolean(state.aspectRatio);

  // ── Step: Capture ────────────────────────────────────────────────
  function renderCapture() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        <div
          style={{
            fontFamily: "'Figtree', sans-serif",
            fontSize: 24,
            lineHeight: 1.34,
            color: TX,
            fontWeight: 700,
            letterSpacing: 0,
          }}
        >
          <span>Generate </span>
          <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400 }}>studio quality</span>
          <span> videos,</span>
          <br />
          <span>with </span>
          <span style={{ color: G }}>one single image</span>
        </div>

        <div style={{ height: 1, background: BD }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 20, fontWeight: 700, color: TX }}>Choose Style</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: DIM }}>Pick a visual theme for your studio asset</span>
          <div
            className="vvs-style-carousel"
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              overscrollBehaviorX: "contain",
              WebkitOverflowScrolling: "touch",
              paddingBottom: 10,
              scrollbarColor: `${G} ${BD}`,
              scrollbarWidth: "thin",
              maxWidth: "100%",
            }}
          >
            {STYLE_LABELS.map(s => (
              <StyleCard
                key={s.value}
                label={s.label}
                videoSrc={s.videoSrc}
                active={state.visualStyle === s.value}
                onClick={() => dispatch({ type: "SET_FIELD", field: "visualStyle", value: s.value })}
              />
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: BD }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 20, fontWeight: 700, color: TX }}>Capture 3 Angles</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: DIM, lineHeight: 1.5 }}>
            Flat surface, even lighting. Tap each zone to upload.
          </span>
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            <AngleUploadCard angle="top" label="Top View" sub="Straight down" guideSrc="/vvs-studio/guide-top.jpg" upload={state.uploads.top} onFile={handleFile} onRemove={handleRemove} />
            <AngleUploadCard angle="left" label="Left Angle" sub="45° left" guideSrc="/vvs-studio/guide-left.jpg" upload={state.uploads.left} onFile={handleFile} onRemove={handleRemove} />
            <AngleUploadCard angle="right" label="Right Angle" sub="45° right" guideSrc="/vvs-studio/guide-right.jpg" upload={state.uploads.right} onFile={handleFile} onRemove={handleRemove} />
          </div>
        </div>

        <div style={{ flex: 1 }} />
        <PrimaryBtn label="NEXT  →" onClick={() => setStep("details")} disabled={!canProceedCapture} />
        <span style={{ fontSize: 11, color: DIM, textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>Step 1 of 4</span>
      </div>
    );
  }

  // ── Step: Details ────────────────────────────────────────────────
  function renderDetails() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 20, fontWeight: 700, color: TX }}>Select Piece</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "nowrap", overflowX: "auto" }}>
            {PIECE_TYPES.map(p => (
              <Chip
                key={p.value}
                label={p.label}
                small
                active={state.pieceType === p.value}
                onClick={() => dispatch({ type: "SET_FIELD", field: "pieceType", value: p.value })}
              />
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: BD }} />

        <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 20, fontWeight: 700, color: TX }}>Piece Details</span>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 11 }}>
          <FInput label="ENGRAVING / TEXT" placeholder="e.g. LOYALTY" value={state.engravingText ?? ""} onChange={v => dispatch({ type: "SET_FIELD", field: "engravingText", value: v || undefined })} />
          <FInput label="PRICE" placeholder="$4,500" value={state.price ?? ""} onChange={v => dispatch({ type: "SET_FIELD", field: "price", value: v || undefined })} optional />
          <FSelect
            label="METAL TYPE"
            value={state.metalType ?? ("" as VvsMetalType)}
            options={[{ value: "" as VvsMetalType, label: "Select..." }, ...METAL_TYPES]}
            onChange={v => dispatch({ type: "SET_FIELD", field: "metalType", value: v || undefined })}
            optional
          />
          <FSelect
            label="GOLD COLOR"
            value={state.goldColor ?? ("" as VvsGoldColor)}
            options={[{ value: "" as VvsGoldColor, label: "Select..." }, ...GOLD_COLORS]}
            onChange={v => dispatch({ type: "SET_FIELD", field: "goldColor", value: v || undefined })}
            optional
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, color: DIM, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.05em" }}>STONE SETTING</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {STONE_SETTINGS.map(s => (
              <Chip
                key={s.value}
                label={s.label}
                active={state.stoneSetting === s.value}
                onClick={() => dispatch({ type: "SET_FIELD", field: "stoneSetting", value: s.value })}
              />
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", gap: 10 }}>
          <SecondaryBtn label="← Back" onClick={() => setStep("capture")} />
          <button
            onClick={() => setStep("theme")}
            disabled={!canProceedDetails}
            style={{
              flex: 2,
              height: 44,
              border: `1.5px solid ${canProceedDetails ? G : BD}`,
              borderRadius: 8,
              background: canProceedDetails ? G + "1a" : PANEL,
              cursor: canProceedDetails ? "pointer" : "not-allowed",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: canProceedDetails ? G : DIM,
              transition: "all 0.15s",
            }}
          >
            NEXT  →
          </button>
        </div>
        <span style={{ fontSize: 11, color: DIM, textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>Step 2 of 4</span>
      </div>
    );
  }

  // ── Step: Theme + Format ─────────────────────────────────────────
  function renderTheme() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 22, fontWeight: 700, color: TX }}>Choose Aesthetic</span>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, color: DIM, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.05em" }}>MOOD</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {MOODS.map(m => (
              <Chip
                key={m.value}
                label={m.label}
                active={state.mood === m.value}
                onClick={() => dispatch({ type: "SET_FIELD", field: "mood", value: m.value })}
              />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, color: DIM, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.05em" }}>ASPECT RATIO</span>
          <div style={{ display: "flex", gap: 8 }}>
            {RATIOS.map(r => (
              <RatioCard
                key={r.value}
                label={r.label}
                sub={r.sub}
                pw={r.pw}
                ph={r.ph}
                active
                onClick={() => undefined}
              />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, color: DIM, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.05em" }}>VIDEO DURATION</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            {VIDEO_DURATIONS.map(option => {
              const active = state.videoDurationSeconds === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => dispatch({ type: "SET_FIELD", field: "videoDurationSeconds", value: option.value })}
                  style={{
                    minHeight: 74,
                    borderRadius: 9,
                    border: `1.5px solid ${active ? G : BD}`,
                    background: active ? G + "14" : BG,
                    color: active ? G : SOFT,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    fontFamily: "'DM Sans', sans-serif",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{option.label}</span>
                  <span style={{ fontSize: 10, color: DIM }}>{option.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => {
            if (!canGenerate) return;
            void runImageGeneration();
          }}
          disabled={!canGenerate}
          style={{
            height: 52,
            width: "100%",
            background: canGenerate ? G : "#35353d",
            border: "none",
            borderRadius: 8,
            cursor: canGenerate ? "pointer" : "not-allowed",
            fontFamily: "'Figtree', sans-serif",
            fontSize: 16,
            fontWeight: 700,
            color: canGenerate ? "#000" : DIM,
            transition: "background 0.15s",
          }}
        >
          ✦  GENERATE STUDIO ASSET
        </button>

        <div style={{ display: "flex", gap: 10 }}>
          <SecondaryBtn label="← Back" onClick={() => setStep("details")} />
          <span style={{ fontSize: 11, color: DIM, display: "flex", alignItems: "center", fontFamily: "'DM Sans', sans-serif" }}>Step 4 of 4</span>
        </div>
      </div>
    );
  }

  // ── Step: Generating Image ───────────────────────────────────────
  function renderGeneratingImage() {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <GenerationProgress kind="image" />
      </div>
    );
  }

  // ── Step: Image Result ───────────────────────────────────────────
  function renderImageResult() {
    return (
      <StudioResultCard
        imageUrl={state.generatedImageUrl ?? ""}
        pieceType={state.pieceType}
        metalType={state.metalType}
        goldColor={state.goldColor}
        stoneSetting={state.stoneSetting}
        engravingText={state.engravingText}
        price={state.price}
        aspectRatio={state.aspectRatio}
        onRegenerate={() => void runImageGeneration(state.shootId)}
        onShare={() => {}}
        onGenerateVideo={() => void runVideoGeneration()}
        onNewShoot={() => void finishAtImage()}
      />
    );
  }

  // ── Step: Generating Video ───────────────────────────────────────
  function renderGeneratingVideo() {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <GenerationProgress kind="video" thumbnailUrl={state.generatedImageUrl} />
      </div>
    );
  }

  // ── Step: Video Result ───────────────────────────────────────────
  function renderVideoResult() {
    return (
      <VideoResultCard
        videoUrl={state.generatedVideoUrl ?? ""}
        aspectRatio={state.aspectRatio}
        pieceType={state.pieceType}
        engravingText={state.engravingText}
        metalType={state.metalType}
        stoneSetting={state.stoneSetting}
        price={state.price}
        onShare={() => {}}
        onNewShoot={reset}
      />
    );
  }

  const isFullscreenStep = ["imageResult", "videoResult", "generatingImage", "generatingVideo"].includes(state.step);

  if (!mounted) {
    return null;
  }

  return (
    <>
      {/* Global VVS Studio keyframe animations */}
      <style
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `
            @import url("https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,600;0,700;1,400;1,700&family=DM+Sans:wght@300;400;500;600&display=swap");
            @keyframes vvs-spin { to { transform: rotate(360deg); } }
            @keyframes vvs-pulse { 0%,100% { opacity:.3; transform:scale(.9); } 50% { opacity:1; transform:scale(1.1); } }
            .vvs-style-carousel::-webkit-scrollbar { display: none; }
            @media (min-width: 1024px) {
              .vvs-wizard-header { left: 18rem !important; }
            }
          `,
        }}
      />

      <WizardHeader step={state.step} onHome={handleHome} />

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          paddingTop: 98,
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: BG,
            borderRadius: 0,
            border: "none",
            display: "flex",
            flexDirection: "column",
            minHeight: isFullscreenStep ? "auto" : "calc(100dvh - 5rem)",
            overflow: "hidden",
            padding: isFullscreenStep ? 0 : "22px 22px 18px",
          }}
        >
          {state.error && (
            <div style={{ margin: "8px 0", padding: "8px 12px", borderRadius: 8, background: "#3d1818", border: "1px solid #7a2b2b", color: "#f08080", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
              {state.error}
            </div>
          )}

          <div style={{ flex: 1, display: "flex", flexDirection: "column", marginTop: isFullscreenStep ? 0 : 14 }}>
            {state.step === "capture" && renderCapture()}
            {state.step === "details" && renderDetails()}
            {state.step === "theme" && renderTheme()}
            {state.step === "generatingImage" && renderGeneratingImage()}
            {state.step === "imageResult" && renderImageResult()}
            {state.step === "generatingVideo" && renderGeneratingVideo()}
            {state.step === "videoResult" && renderVideoResult()}
          </div>
        </div>
      </div>
    </>
  );
}
