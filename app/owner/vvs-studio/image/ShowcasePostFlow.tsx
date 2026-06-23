"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MobileOwnerNav from "../../MobileOwnerNav";
import StepProgress from "../components/StepProgress";
import AngleUploadCard from "../components/AngleUploadCard";
import type {
  VvsGoldColor,
  VvsMetalType,
  VvsPieceType,
  VvsStoneSetting,
  VvsUploadedFile,
  VvsVisualStyle,
} from "../types";

const GOLD = "#D4A853";
const BG = "#16161a";
const PANEL = "#1e1e24";
const BORDER = "#35353d";
const TEXT = "#eaeaf0";
const SOFT = "#c0c0c8";
const DIM = "#606068";

type ImageStep = "capture" | "details" | "theme" | "generating" | "result";
type ImageAspectRatio = "four_three" | "story";
type Uploads = Partial<Record<"top" | "left" | "right", VvsUploadedFile>>;
type GeneratedImage = { id: string; url: string };

type StyleOption = {
  value: VvsVisualStyle;
  label: string;
  stillSrc: string;
};

const STYLE_OPTIONS: StyleOption[] = [
  { value: "prisma", label: "Prisma", stillSrc: "/vvs-studio/style-stills/style-1.jpg" },
  { value: "noir", label: "Noir", stillSrc: "/vvs-studio/style-stills/style-2.jpg" },
  { value: "glacier", label: "Glacier", stillSrc: "/vvs-studio/style-stills/style-3.jpg" },
  { value: "gold_marble", label: "Gold Marble", stillSrc: "/vvs-studio/style-stills/style-4.jpg" },
];

const PIECE_TYPES: { value: VvsPieceType; label: string }[] = [
  { value: "pendant", label: "Pendant" },
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
  { value: "micro_pave", label: "Micro Pave" },
  { value: "flooded", label: "Flooded" },
  { value: "baguette", label: "Baguette" },
  { value: "invisible", label: "Invisible" },
];

const RATIOS: { value: ImageAspectRatio; label: string; sub: string; width: number; height: number }[] = [
  { value: "four_three", label: "Post", sub: "4:3 Instagram feed", width: 48, height: 36 },
  { value: "story", label: "Story", sub: "9:16 Reels / TikTok", width: 29, height: 52 },
];

const STEP_INDEX: Record<ImageStep, number> = {
  capture: 0,
  details: 1,
  theme: 2,
  generating: 3,
  result: 3,
};

const IMAGE_FLOW_STEPS = ["Capture", "Details", "Theme", "Image"] as const;

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "5px 13px",
        borderRadius: 20,
        flexShrink: 0,
        border: `1.5px solid ${active ? GOLD : BORDER}`,
        background: active ? `${GOLD}22` : BG,
        cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        color: active ? GOLD : SOFT,
      }}
    >
      {label}
    </button>
  );
}

function StyleCard({
  option,
  active,
  onClick,
}: {
  option: StyleOption;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={{ flex: "0 0 108px", display: "flex", flexDirection: "column", cursor: "pointer", border: 0, padding: 0, background: "transparent" }}>
      <span
        style={{
          height: 170,
          border: `2px solid ${active ? GOLD : BORDER}`,
          borderRadius: 8,
          background: PANEL,
          position: "relative",
          overflow: "hidden",
          display: "block",
        }}
      >
        <img
          src={option.stillSrc}
          alt=""
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
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: active
              ? "linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.28))"
              : "linear-gradient(180deg, rgba(0,0,0,0.24), rgba(0,0,0,0.54))",
          }}
        />
        {active && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 5,
              right: 5,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: GOLD,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#000",
              fontSize: 8,
              fontWeight: 900,
            }}
          >
            ok
          </span>
        )}
        <span
          style={{
            position: "absolute",
            left: 9,
            right: 9,
            bottom: 9,
            fontSize: 12,
            color: active ? GOLD : DIM,
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textAlign: "left",
          }}
        >
          {option.label}
        </span>
      </span>
    </button>
  );
}

function FieldLabel({ label, optional }: { label: string; optional?: boolean }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: DIM, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.05em" }}>
      <span>{label}</span>
      {optional && (
        <span style={{ borderRadius: 999, border: `1px solid ${BORDER}`, padding: "1px 5px", fontSize: 8, lineHeight: 1.2, letterSpacing: "0.04em", color: "#8f8f98" }}>
          OPTIONAL
        </span>
      )}
    </span>
  );
}

function TextInput({
  label,
  placeholder,
  value,
  onChange,
  optional,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
      <FieldLabel label={label} optional={optional} />
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        style={{
          height: 32,
          width: "100%",
          boxSizing: "border-box",
          border: `1px solid ${BORDER}`,
          borderRadius: 5,
          background: BG,
          padding: "0 9px",
          color: TEXT,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          outline: "none",
        }}
      />
    </label>
  );
}

function SelectInput<T extends string>({
  label,
  value,
  options,
  onChange,
  optional,
}: {
  label: string;
  value: T | "";
  options: { value: T; label: string }[];
  onChange: (value: T | "") => void;
  optional?: boolean;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
      <FieldLabel label={label} optional={optional} />
      <select
        value={value}
        onChange={event => onChange(event.target.value as T | "")}
        style={{
          height: 32,
          width: "100%",
          boxSizing: "border-box",
          border: `1px solid ${BORDER}`,
          borderRadius: 5,
          background: BG,
          padding: "0 9px",
          color: TEXT,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          outline: "none",
          cursor: "pointer",
        }}
      >
        <option value="">Select...</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function UploadedPreviewStrip({ uploads }: { uploads: Uploads }) {
  const entries = ([
    ["top", "Top View"],
    ["left", "Left Angle"],
    ["right", "Right Angle"],
  ] as const)
    .map(([angle, label]) => ({ angle, label, upload: uploads[angle] }))
    .filter(entry => entry.upload?.previewUrl || entry.upload?.normalizedImageUrl);

  if (!entries.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: 11, color: DIM, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.08em" }}>
          UPLOADED PHOTO{entries.length > 1 ? "S" : ""}
        </span>
        <span style={{ fontSize: 10, color: GOLD, fontFamily: "'DM Sans', sans-serif" }}>{entries.length} attached</span>
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
        {entries.map(({ angle, label, upload }) => (
          <div
            key={angle}
            style={{
              flex: entries.length === 1 ? "1 1 100%" : "0 0 112px",
              minWidth: 0,
              borderRadius: 11,
              border: `1px solid ${BORDER}`,
              background: PANEL,
              overflow: "hidden",
            }}
          >
            <div style={{ position: "relative", aspectRatio: entries.length === 1 ? "16/9" : "1/1", background: BG }}>
              <img
                src={upload?.previewUrl ?? upload?.normalizedImageUrl}
                alt={`${label} upload`}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              {angle === "top" && (
                <span
                  style={{
                    position: "absolute",
                    top: 7,
                    left: 7,
                    borderRadius: 999,
                    background: GOLD,
                    color: "#050505",
                    padding: "3px 7px",
                    fontSize: 9,
                    fontWeight: 800,
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "0.04em",
                  }}
                >
                  SOURCE
                </span>
              )}
            </div>
            <div style={{ padding: "7px 9px" }}>
              <span style={{ display: "block", fontSize: 11, color: TEXT, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
              <span style={{ display: "block", marginTop: 2, fontSize: 10, color: DIM, fontFamily: "'DM Sans', sans-serif" }}>Ready</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RatioCard({
  option,
  active,
  onClick,
}: {
  option: (typeof RATIOS)[number];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "10px 6px",
        cursor: "pointer",
        borderRadius: 9,
        border: `1.5px solid ${active ? GOLD : BORDER}`,
        background: active ? `${GOLD}12` : BG,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 52 }}>
        <span
          style={{
            width: option.width,
            height: option.height,
            border: `2px solid ${active ? GOLD : "#555"}`,
            borderRadius: 3,
            background: active ? `${GOLD}22` : PANEL,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {active && <span style={{ width: Math.round(option.width * 0.4), height: Math.round(option.height * 0.4), borderRadius: 2, background: `${GOLD}55` }} />}
        </span>
      </span>
      <span style={{ fontSize: 13, color: active ? GOLD : SOFT, fontWeight: active ? 600 : 400, textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>{option.label}</span>
      <span style={{ fontSize: 10, color: DIM, textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>{option.sub}</span>
    </button>
  );
}

function SecondaryButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 44,
        flex: 1,
        border: `1.5px solid ${BORDER}`,
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

function PrimaryButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 48,
        width: "100%",
        background: disabled ? BORDER : `${GOLD}1a`,
        border: `1.5px solid ${disabled ? BORDER : GOLD}`,
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 14,
        fontWeight: 600,
        color: disabled ? DIM : GOLD,
      }}
    >
      {label}
    </button>
  );
}

function Header({ step, onHome }: { step: ImageStep; onHome: () => void }) {
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        background: BG,
        borderBottom: `1px solid ${BORDER}`,
        padding: "12px 18px 10px",
        boxShadow: "0 10px 28px rgba(0,0,0,0.22)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <MobileOwnerNav active="Studio" />
        <img src="/vvs-studio/logo.png" alt="VVS Studio" style={{ height: 28, objectFit: "contain", mixBlendMode: "lighten", opacity: 0.92 }} />
        <button
          type="button"
          onClick={onHome}
          aria-label="Close image generator"
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            border: `1.5px solid ${BORDER}`,
            background: PANEL,
            color: DIM,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          x
        </button>
      </div>
      <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
        <StepProgress current={STEP_INDEX[step]} steps={IMAGE_FLOW_STEPS} />
      </div>
    </header>
  );
}

function LoadingState({ stage }: { stage: string }) {
  const copy = stage === "image_source_cleanup"
    ? ["Preparing your product", "Cleaning the source photo while preserving the pendant details."]
    : ["Creating your first photo", "Placing the cleaned product into the selected studio environment."];
  return (
    <div style={{ minHeight: "calc(100dvh - 190px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, textAlign: "center" }}>
      <div style={{ width: 96, height: 96, borderRadius: "50%", border: `3px solid ${GOLD}44`, borderTopColor: GOLD, animation: "vvs-image-spin 1s linear infinite", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: GOLD, fontSize: 28 }}>*</span>
      </div>
      <div>
        <h1 style={{ margin: 0, fontFamily: "'Figtree', sans-serif", fontSize: 28, color: TEXT }}>
          {copy[0]}
        </h1>
        <p style={{ margin: "8px 0 0", fontFamily: "'DM Sans', sans-serif", color: "#9c9da6", lineHeight: 1.5 }}>
          {copy[1]}
        </p>
      </div>
    </div>
  );
}

function SparkleIcon() {
  return <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>✦</span>;
}

function ResultState({
  images,
  selectedIndex,
  caption,
  onSelect,
  onCaptionChange,
  onCaptionBlur,
  onGenerateCaption,
  generatingSecond,
}: {
  images: GeneratedImage[];
  selectedIndex: number;
  caption: string;
  onSelect: (index: number) => void;
  onCaptionChange: (value: string) => void;
  onCaptionBlur: () => void;
  onGenerateCaption: () => void;
  generatingSecond: boolean;
}) {
  function saveImages() {
    images.forEach((image, index) => {
      const link = document.createElement("a");
      link.href = image.url;
      link.download = `vvs-studio-image-${index + 1}.png`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: "'Figtree', sans-serif", fontSize: 25, color: TEXT }}>Studio product photos</h1>
        <p style={{ margin: "6px 0 0", color: DIM, fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>Choose the image you want to open or caption.</p>
      </div>

      <div style={{ display: "flex", gap: 12, overflowX: "auto", scrollSnapType: "x mandatory", padding: "2px 2px 8px" }}>
        {images.map((image, index) => {
          const active = selectedIndex === index;
          return (
            <button
              key={image.id}
              type="button"
              onClick={() => onSelect(index)}
              aria-label={`Select generated image ${index + 1}`}
              style={{
                position: "relative",
                flex: "0 0 calc(88% - 8px)",
                aspectRatio: "4 / 5",
                scrollSnapAlign: "start",
                padding: 0,
                overflow: "hidden",
                borderRadius: 15,
                border: `2px solid ${active ? GOLD : BORDER}`,
                background: "#08080a",
                cursor: "pointer",
              }}
            >
              <img src={image.url} alt={`Generated studio product photo ${index + 1}`} style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }} />
              <span style={{ position: "absolute", top: 12, left: 12, borderRadius: 999, padding: "5px 9px", background: "rgba(10,10,12,0.82)", border: `1px solid ${active ? GOLD : BORDER}`, color: active ? GOLD : SOFT, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700 }}>
                {index + 1} of {images.length}
              </span>
            </button>
          );
        })}
        {images.length === 1 && generatingSecond ? (
          <div
            style={{
              flex: "0 0 calc(88% - 8px)",
              aspectRatio: "4 / 5",
              scrollSnapAlign: "start",
              borderRadius: 15,
              border: `1.5px dashed #50505a`,
              background: PANEL,
              color: GOLD,
              cursor: "wait",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            <span style={{ width: 52, height: 52, borderRadius: "50%", border: `1.5px solid ${GOLD}`, display: "grid", placeItems: "center", fontSize: 20, animation: "vvs-image-spin 1s linear infinite" }}>✦</span>
            Creating detail shot
          </div>
        ) : null}
      </div>

      <section style={{ borderRadius: 14, border: `1px solid ${BORDER}`, background: PANEL, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <label htmlFor="studio-caption" style={{ color: SOFT, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em" }}>CAPTION</label>
          <button type="button" onClick={onGenerateCaption} style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${GOLD}88`, background: `${GOLD}12`, color: GOLD, padding: "0 11px", display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700 }}>
            <SparkleIcon /> Auto-generate
          </button>
        </div>
        <textarea
          id="studio-caption"
          value={caption}
          onChange={event => onCaptionChange(event.target.value)}
          onBlur={onCaptionBlur}
          maxLength={300}
          placeholder="Write a caption for this post..."
          style={{ width: "100%", minHeight: 104, resize: "vertical", boxSizing: "border-box", borderRadius: 9, border: `1px solid ${BORDER}`, background: BG, color: TEXT, padding: 12, outline: "none", fontFamily: "'DM Sans', sans-serif", fontSize: 14, lineHeight: 1.5 }}
        />
        <div style={{ marginTop: 6, color: DIM, textAlign: "right", fontFamily: "'DM Sans', sans-serif", fontSize: 11 }}>{caption.length} / 300</div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
        <button
          type="button"
          onClick={saveImages}
          style={{
            height: 48,
            borderRadius: 8,
            border: `1.5px solid ${GOLD}cc`,
            color: GOLD,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {images.length === 1 ? "Save image" : `Save ${images.length} images`}
        </button>
      </div>
    </div>
  );
}

export default function ShowcasePostFlow() {
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const [step, setStep] = useState<ImageStep>("capture");
  const [uploads, setUploads] = useState<Uploads>({});
  const [visualStyle, setVisualStyle] = useState<VvsVisualStyle>();
  const [pieceType, setPieceType] = useState<VvsPieceType>("pendant");
  const [engravingText, setEngravingText] = useState("");
  const [price, setPrice] = useState("");
  const [metalType, setMetalType] = useState<VvsMetalType | "">("");
  const [goldColor, setGoldColor] = useState<VvsGoldColor | "">("");
  const [stoneSetting, setStoneSetting] = useState<VvsStoneSetting>();
  const mood = "luxury";
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>("four_three");
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [pipelineStage, setPipelineStage] = useState("image_source_cleanup");
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [caption, setCaption] = useState("");
  const [activeShootId, setActiveShootId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      Object.values(uploads).forEach(upload => {
        if (upload?.previewUrl) URL.revokeObjectURL(upload.previewUrl);
      });
    };
  }, [uploads]);

  const handleHome = useCallback(() => {
    if (step === "capture" || window.confirm("Your current showcase post draft will be lost if you leave. Go back home?")) {
      router.push("/owner/vvs-studio");
    }
  }, [router, step]);

  function handleFile(angle: "top" | "left" | "right", file: File) {
    setUploads(current => {
      const existing = current[angle];
      if (existing?.previewUrl) URL.revokeObjectURL(existing.previewUrl);
      return {
        ...current,
        [angle]: {
          localFile: file,
          previewUrl: URL.createObjectURL(file),
          status: "local",
        },
      };
    });
  }

  function handleRemove(angle: "top" | "left" | "right") {
    setUploads(current => {
      const existing = current[angle];
      if (existing?.previewUrl) URL.revokeObjectURL(existing.previewUrl);
      const next = { ...current };
      delete next[angle];
      return next;
    });
  }

  function cancelPending() {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  }

  async function pollImagePipeline(shootId: string, jobId: string, signal: AbortSignal) {
    while (!signal.aborted) {
      await new Promise(resolve => window.setTimeout(resolve, 2500));
      if (signal.aborted) return;
      const response = await fetch(`/api/owner/vvs-studio/shoots/${shootId}`, { signal });
      if (!response.ok) throw new Error(`Poll failed: HTTP ${response.status}`);
      const data = await response.json() as {
        imageGenerations: Array<{ id: string; stage: string | null; status: string; imageUrl?: string | null }>;
        jobs: Array<{ id: string; status: string; currentStage: string; error?: string | null }>;
      };
      const job = data.jobs.find(item => item.id === jobId);
      if (!job) throw new Error("Image pipeline job was not found.");
      setPipelineStage(job.currentStage);
      const shots = data.imageGenerations
        .filter(item => item.status === "succeeded" && item.imageUrl && (item.stage === "image_hero_shot" || item.stage === "image_macro_shot"))
        .sort((a, b) => (a.stage === "image_hero_shot" ? -1 : 1))
        .map(item => ({ id: item.id, url: item.imageUrl! }));
      if (shots.length) {
        setGeneratedImages(shots);
        setSelectedImageIndex(shots.length - 1);
        setStep("result");
      }
      if (job.status === "succeeded") {
        setPipelineRunning(false);
        return;
      }
      if (job.status === "failed") throw new Error(job.error || "Image generation failed.");
    }
  }

  async function runGeneration() {
    if (!uploads.top?.localFile || !visualStyle || !pieceType || !mood || !aspectRatio) return;
    const signal = cancelPending();
    setError(null);
    setPipelineStage("image_source_cleanup");
    setPipelineRunning(true);
    setStep("generating");

    try {
      const createResponse = await fetch("/api/owner/vvs-studio/shoots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pieceType, visualStyle }),
        signal,
      });
      const createData = await createResponse.json().catch(() => ({}));
      if (!createResponse.ok) throw new Error(createData.error ?? "Failed to create shoot.");
      const shootId = createData.shootId as string;
      setActiveShootId(shootId);

      await Promise.all(
        (["top", "left", "right"] as const)
          .filter(angle => uploads[angle]?.localFile)
          .map(async angle => {
            const formData = new FormData();
            formData.append("file", uploads[angle]!.localFile!);
            formData.append("angle", angle);
            const uploadResponse = await fetch(`/api/owner/vvs-studio/shoots/${shootId}/uploads`, {
              method: "POST",
              body: formData,
              signal,
            });
            const uploadData = await uploadResponse.json().catch(() => ({}));
            if (!uploadResponse.ok) throw new Error(uploadData.error ?? `Failed to upload ${angle} photo.`);
          })
      );

      const patchResponse = await fetch(`/api/owner/vvs-studio/shoots/${shootId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pieceType,
          visualStyle,
          mood,
          aspectRatio,
          metalType: metalType || undefined,
          goldColor: goldColor || undefined,
          engravingText: engravingText || undefined,
          priceLabel: price || undefined,
          stoneSetting: stoneSetting || undefined,
        }),
        signal,
      });
      const patchData = await patchResponse.json().catch(() => ({}));
      if (!patchResponse.ok) throw new Error(patchData.error ?? "Failed to save shoot details.");

      const generateResponse = await fetch(`/api/owner/vvs-studio/shoots/${shootId}/start-image-pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal,
      });
      const generateData = await generateResponse.json().catch(() => ({}));
      if (!generateResponse.ok) throw new Error(generateData.error ?? "Failed to start image generation.");
      await pollImagePipeline(shootId, generateData.jobId as string, signal);
    } catch (err) {
      if (signal.aborted) return;
      setPipelineRunning(false);
      setError(err instanceof Error ? err.message : "Image generation failed.");
      setStep(generatedImages.length ? "result" : "theme");
    }
  }

  const canProceedCapture = Boolean(visualStyle && uploads.top);
  const canProceedDetails = Boolean(pieceType);
  const canGenerate = Boolean(mood && aspectRatio && uploads.top && visualStyle);

  async function saveCaption(value: string) {
    if (!activeShootId) return;
    const response = await fetch(`/api/owner/vvs-studio/shoots/${activeShootId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: value }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Failed to save caption.");
    }
  }

  function generateCaption() {
    const styleLabel = STYLE_OPTIONS.find(option => option.value === visualStyle)?.label ?? "studio";
    const metal = goldColor ? goldColor.replace(/_/g, " ") : metalType ? metalType.replace(/_/g, " ") : "fine jewelry";
    const subject = engravingText ? `${engravingText} pendant` : `${pieceType} design`;
    const nextCaption = `${subject} in ${metal}, photographed in the ${styleLabel} studio style. Crafted to stand out from every angle.`.slice(0, 300);
    setCaption(nextCaption);
    void saveCaption(nextCaption);
  }

  function renderCapture() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 24, lineHeight: 1.34, color: TEXT, fontWeight: 700 }}>
          <span>Generate studio product photography </span>
          <span style={{ color: GOLD }}>with your phone</span>
        </div>

        <div style={{ height: 1, background: BORDER }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 20, fontWeight: 700, color: TEXT }}>Choose Style</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: DIM }}>Pick a visual theme for your studio asset</span>
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              overscrollBehaviorX: "contain",
              WebkitOverflowScrolling: "touch",
              paddingBottom: 10,
              scrollbarColor: `${GOLD} ${BORDER}`,
              scrollbarWidth: "thin",
              maxWidth: "100%",
            }}
          >
            {STYLE_OPTIONS.map(option => (
              <StyleCard key={option.value} option={option} active={visualStyle === option.value} onClick={() => setVisualStyle(option.value)} />
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: BORDER }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 20, fontWeight: 700, color: TEXT }}>Upload Your Product</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: DIM, lineHeight: 1.5 }}>
            Top view is required. Extra angles are saved as reference for the still.
          </span>
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            <AngleUploadCard angle="top" label="Top View" sub="Straight down" guideSrc="/vvs-studio/guide-top.jpg" upload={uploads.top} onFile={handleFile} onRemove={handleRemove} />
            <AngleUploadCard angle="left" label="Left Angle" sub="45 deg left" guideSrc="/vvs-studio/guide-left.jpg" upload={uploads.left} onFile={handleFile} onRemove={handleRemove} />
            <AngleUploadCard angle="right" label="Right Angle" sub="45 deg right" guideSrc="/vvs-studio/guide-right.jpg" upload={uploads.right} onFile={handleFile} onRemove={handleRemove} />
          </div>
        </div>

        <div style={{ height: 1, background: BORDER }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, color: DIM, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.05em" }}>ASPECT RATIO</span>
          <div style={{ display: "flex", gap: 8 }}>
            {RATIOS.map(option => (
              <RatioCard key={option.value} option={option} active={aspectRatio === option.value} onClick={() => setAspectRatio(option.value)} />
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />
        <PrimaryButton label="NEXT ->" onClick={() => setStep("details")} disabled={!canProceedCapture} />
        <span style={{ fontSize: 11, color: DIM, textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>Step 1 of 4</span>
      </div>
    );
  }

  function renderDetails() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
        <UploadedPreviewStrip uploads={uploads} />
        <div style={{ height: 1, background: BORDER }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 20, fontWeight: 700, color: TEXT }}>Select Piece</span>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {PIECE_TYPES.map(option => (
              <Chip key={option.value} label={option.label} active={pieceType === option.value} onClick={() => setPieceType(option.value)} />
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: BORDER }} />
        <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 20, fontWeight: 700, color: TEXT }}>Piece Details</span>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 11 }}>
          <TextInput label="ENGRAVING / TEXT" placeholder="e.g. LOYALTY" value={engravingText} onChange={setEngravingText} />
          <TextInput label="PRICE" placeholder="$4,500" value={price} onChange={setPrice} optional />
          <SelectInput label="METAL TYPE" value={metalType} options={METAL_TYPES} onChange={setMetalType} optional />
          <SelectInput label="GOLD COLOR" value={goldColor} options={GOLD_COLORS} onChange={setGoldColor} optional />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, color: DIM, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.05em" }}>STONE SETTING</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {STONE_SETTINGS.map(option => (
              <Chip key={option.value} label={option.label} active={stoneSetting === option.value} onClick={() => setStoneSetting(option.value)} />
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 10 }}>
          <SecondaryButton label="<- Back" onClick={() => setStep("capture")} />
          <button
            type="button"
            onClick={() => setStep("theme")}
            disabled={!canProceedDetails}
            style={{
              flex: 2,
              height: 44,
              border: `1.5px solid ${canProceedDetails ? GOLD : BORDER}`,
              borderRadius: 8,
              background: canProceedDetails ? `${GOLD}1a` : PANEL,
              cursor: canProceedDetails ? "pointer" : "not-allowed",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: canProceedDetails ? GOLD : DIM,
            }}
          >
            NEXT {"->"}
          </button>
        </div>
        <span style={{ fontSize: 11, color: DIM, textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>Step 2 of 4</span>
      </div>
    );
  }

  function renderTheme() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 22, fontWeight: 700, color: TEXT }}>Choose Aesthetic</span>

        {error && (
          <div style={{ borderRadius: 10, border: "1px solid #7f2f2f", background: "#301819", color: "#ffd2d2", padding: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => void runGeneration()}
          disabled={!canGenerate}
          style={{
            height: 52,
            width: "100%",
            background: canGenerate ? GOLD : BORDER,
            border: "none",
            borderRadius: 8,
            cursor: canGenerate ? "pointer" : "not-allowed",
            fontFamily: "'Figtree', sans-serif",
            fontSize: 16,
            fontWeight: 700,
            color: canGenerate ? "#000" : DIM,
          }}
        >
          GENERATE STUDIO ASSET
        </button>
        <div style={{ display: "flex", gap: 10 }}>
          <SecondaryButton label="<- Back" onClick={() => setStep("details")} />
          <span style={{ fontSize: 11, color: DIM, display: "flex", alignItems: "center", fontFamily: "'DM Sans', sans-serif" }}>Step 4 of 4</span>
        </div>
      </div>
    );
  }

  function renderCurrentStep() {
    if (step === "capture") return renderCapture();
    if (step === "details") return renderDetails();
    if (step === "theme") return renderTheme();
    if (step === "generating") return <LoadingState stage={pipelineStage} />;
    return (
      <ResultState
        images={generatedImages}
        selectedIndex={selectedImageIndex}
        caption={caption}
        onSelect={setSelectedImageIndex}
        onCaptionChange={setCaption}
        onCaptionBlur={() => void saveCaption(caption)}
        onGenerateCaption={generateCaption}
        generatingSecond={pipelineRunning && generatedImages.length === 1}
      />
    );
  }

  return (
    <main style={{ minHeight: "100dvh", background: BG, color: TEXT, paddingTop: 108 }}>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Figtree:wght@500;600;700;800&family=DM+Sans:wght@400;500;700&display=swap");
        @keyframes vvs-image-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
      <Header step={step} onHome={handleHome} />
      <div style={{ width: "100%", maxWidth: 430, minHeight: "calc(100dvh - 108px)", margin: "0 auto", padding: "28px 22px 18px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        {renderCurrentStep()}
      </div>
    </main>
  );
}
