"use client";

type Props = {
  imageUrl: string;
  pieceType?: string;
  metalType?: string;
  goldColor?: string;
  stoneSetting?: string;
  diamondWeight?: string;
  engravingText?: string;
  price?: string;
  aspectRatio?: "square" | "expanded" | "story";
  onRegenerate: () => void;
  onDownload?: () => void;
  onShare: () => void;
  onGenerateVideo: () => void;
  onNewShoot: () => void;
};

const ASPECT_STYLE: Record<string, React.CSSProperties> = {
  square: { aspectRatio: "1/1" },
  expanded: { aspectRatio: "4/5" },
  story: { aspectRatio: "9/16", maxHeight: 380 },
};

export default function StudioResultCard({
  imageUrl,
  pieceType,
  metalType,
  goldColor,
  stoneSetting,
  diamondWeight,
  engravingText,
  price,
  aspectRatio = "square",
  onRegenerate,
  onDownload,
  onShare,
  onGenerateVideo,
  onNewShoot,
}: Props) {
  const metalLabel = [metalType?.replace(/_/g, " ").toUpperCase(), goldColor?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())].filter(Boolean).join(" · ");
  const infoLine = [metalLabel, stoneSetting?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), diamondWeight].filter(Boolean).join("  ·  ");
  const pieceLabel = [engravingText?.toUpperCase() ?? pieceType?.toUpperCase(), "PENDANT"].filter(Boolean).join(" ");

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ url: imageUrl });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(imageUrl);
      onShare();
    } catch {
      // nothing
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          padding: "0 22px",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span
          style={{ fontSize: 13, color: "#606068", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}
          onClick={onNewShoot}
        >
          ← Back
        </span>
        <span aria-hidden="true" />
        <span
          style={{ fontSize: 13, color: "#D4A853", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}
          onClick={handleShare}
        >
          ↑ Share
        </span>
      </div>

      {/* Regenerate — safe zone up top */}
      <div style={{ display: "flex", gap: 8, padding: "0 22px 12px", flexShrink: 0 }}>
        <button
          onClick={onRegenerate}
          style={{
            flex: 1,
            height: 36,
            border: "1.5px solid #35353d",
            borderRadius: 8,
            background: "#1e1e24",
            cursor: "pointer",
            color: "#c0c0c8",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
          }}
        >
          ↺  Regenerate
        </button>
      </div>

      <div style={{ height: 1, background: "#35353d", margin: "0 22px", flexShrink: 0 }} />

      {/* Generated image */}
      <div
        style={{
          margin: "12px 22px 0",
          ...ASPECT_STYLE[aspectRatio],
          border: "1px solid #35353d",
          borderRadius: 14,
          position: "relative",
          overflow: "hidden",
          background: "#1e1e24",
          flexShrink: 0,
        }}
      >
        <img src={imageUrl} alt="Generated studio asset" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            right: 12,
            background: "#1e1e24ee",
            border: "1px solid #35353d",
            borderRadius: 10,
            padding: "8px 12px",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: "#eaeaf0", fontFamily: "'DM Sans', sans-serif", display: "block" }}>{pieceLabel}</span>
          <div style={{ display: "flex", gap: 10, marginTop: 3, alignItems: "center" }}>
            {infoLine && <span style={{ fontSize: 11, color: "#606068", fontFamily: "'DM Sans', sans-serif" }}>{infoLine}</span>}
            {price && <span style={{ fontSize: 12, color: "#D4A853", fontFamily: "'DM Sans', sans-serif" }}>{price}</span>}
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Bottom actions */}
      <div style={{ padding: "12px 22px 28px", display: "flex", flexDirection: "column", gap: 10 }}>
        <a
          href={imageUrl}
          download
          onClick={onDownload}
          style={{
            height: 44,
            width: "100%",
            border: "1.5px solid #35353d",
            borderRadius: 8,
            background: "#1e1e24",
            cursor: "pointer",
            color: "#c0c0c8",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
          }}
        >
          ↓  Save Image
        </a>
        <button
          onClick={onGenerateVideo}
          style={{
            height: 58,
            background: "#D4A853",
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: "#000", fontFamily: "'Figtree', sans-serif" }}>⬡  Generate Video Reel</span>
          <span style={{ fontSize: 11, color: "#000", opacity: 0.55, fontFamily: "'DM Sans', sans-serif" }}>Motion reel from this image</span>
        </button>
        <button
          onClick={onNewShoot}
          style={{
            height: 40,
            border: "1.5px solid #35353d",
            borderRadius: 8,
            background: "transparent",
            cursor: "pointer",
            color: "#606068",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
          }}
        >
          Finish Here  ·  Start New Shoot
        </button>
      </div>
    </div>
  );
}
