"use client";

type Props = {
  videoUrl: string;
  aspectRatio?: "square" | "expanded" | "story";
  pieceType?: string;
  engravingText?: string;
  metalType?: string;
  stoneSetting?: string;
  price?: string;
  onDownload?: () => void;
  onShare: () => void;
  onNewShoot: () => void;
};

export default function VideoResultCard({
  videoUrl,
  aspectRatio = "story",
  pieceType,
  engravingText,
  metalType,
  stoneSetting,
  price,
  onDownload,
  onShare,
  onNewShoot,
}: Props) {
  const RATIO_LABEL: Record<string, string> = { square: "1:1", expanded: "4:5", story: "9:16" };
  const ratioLabel = RATIO_LABEL[aspectRatio] ?? "9:16";
  const pieceLabel = [engravingText?.toUpperCase() ?? pieceType?.toUpperCase(), "PENDANT"].filter(Boolean).join(" ");
  const metalLabel = metalType?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const settingLabel = stoneSetting?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ url: videoUrl });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(videoUrl);
      onShare();
    } catch {
      // nothing
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ height: 52, display: "flex", alignItems: "center", padding: "0 22px", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: "#606068", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }} onClick={onNewShoot}>
          ← Back
        </span>
        <span aria-hidden="true" />
        <span style={{ fontSize: 13, color: "#D4A853", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }} onClick={handleShare}>
          ↑ Share
        </span>
      </div>

      {/* Status tags */}
      <div style={{ display: "flex", gap: 8, padding: "0 22px 10px", flexShrink: 0, flexWrap: "wrap" }}>
        {[
          { label: "⬡  Video Reel", gold: false },
          { label: `${ratioLabel}`, gold: false },
          { label: "Ready", gold: true },
        ].map(tag => (
          <div
            key={tag.label}
            style={{
              padding: "3px 10px",
              borderRadius: 20,
              border: `1px solid ${tag.gold ? "#D4A85344" : "#35353d"}`,
              background: tag.gold ? "#D4A8530e" : "#1e1e24",
            }}
          >
            <span style={{ fontSize: 11, color: tag.gold ? "#D4A853" : "#606068", fontFamily: "'DM Sans', sans-serif" }}>
              {tag.label}
            </span>
          </div>
        ))}
      </div>

      {/* Video player */}
      <div style={{ margin: "0 22px", position: "relative", borderRadius: 14, overflow: "hidden", background: "#1e1e24", border: "1px solid #35353d", flexShrink: 0 }}>
        <video
          src={videoUrl}
          controls
          playsInline
          style={{ width: "100%", display: "block", maxHeight: 340, objectFit: "cover" }}
        />
        {/* Info overlay */}
        <div style={{ padding: "8px 12px", background: "#1e1e24", borderTop: "1px solid #35353d" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#eaeaf0", fontFamily: "'DM Sans', sans-serif", display: "block" }}>{pieceLabel}</span>
          <div style={{ display: "flex", gap: 8, marginTop: 2, alignItems: "center" }}>
            {[metalLabel, settingLabel].filter(Boolean).map((v, i) => (
              <span key={i} style={{ fontSize: 10, color: "#606068", fontFamily: "'DM Sans', sans-serif" }}>{v}</span>
            ))}
            {price && <span style={{ fontSize: 11, color: "#D4A853", fontFamily: "'DM Sans', sans-serif" }}>{price}</span>}
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Actions */}
      <div style={{ padding: "12px 22px 28px", display: "flex", flexDirection: "column", gap: 10 }}>
        <a
          href={videoUrl}
          download
          onClick={onDownload}
          style={{
            height: 52,
            background: "#D4A853",
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
            fontFamily: "'Figtree', sans-serif",
            fontSize: 16,
            fontWeight: 700,
            color: "#000",
          }}
        >
          ↓  Save Video
        </a>
        <button
          onClick={onNewShoot}
          style={{
            height: 44,
            border: "1.5px solid #35353d",
            borderRadius: 8,
            background: "transparent",
            cursor: "pointer",
            color: "#c0c0c8",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
          }}
        >
          + New Shoot
        </button>
      </div>
    </div>
  );
}
