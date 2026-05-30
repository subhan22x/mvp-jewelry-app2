"use client";

import { useRef } from "react";
import type { VvsUploadedFile } from "../types";

type Props = {
  angle: "top" | "left" | "right";
  label: string;
  sub: string;
  guideSrc: string;
  upload?: VvsUploadedFile;
  onFile: (angle: "top" | "left" | "right", file: File) => void;
  onRemove: (angle: "top" | "left" | "right") => void;
};

export default function AngleUploadCard({
  angle,
  label,
  sub,
  guideSrc,
  upload,
  onFile,
  onRemove,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasPreview = upload?.previewUrl;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(angle, file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(angle, file);
  }

  const isUploading = upload?.status === "uploading";

  return (
    <div className="flex flex-col items-center gap-1.5" style={{ cursor: "pointer" }}>
      <div
        onClick={() => !hasPreview && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{
          width: 96,
          height: 96,
          border: `2px dashed ${hasPreview ? "#D4A853" : "#35353d"}`,
          borderRadius: 10,
          overflow: "hidden",
          background: "#16161a",
          position: "relative",
          cursor: hasPreview ? "default" : "pointer",
          transition: "border-color 0.15s",
        }}
      >
        {hasPreview ? (
          <img
            src={upload.previewUrl}
            alt={label}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <img
            src={guideSrc}
            alt={label}
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }}
          />
        )}
        {isUploading && (
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
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "2.5px solid #35353d",
                borderTopColor: "#D4A853",
                animation: "vvs-spin 1s linear infinite",
              }}
            />
          </div>
        )}
        {hasPreview && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(angle);
            }}
            style={{
              position: "absolute",
              top: 5,
              right: 5,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "rgba(22,22,26,0.85)",
              border: "1px solid #35353d",
              color: "#c0c0c8",
              fontSize: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              lineHeight: 1,
            }}
            aria-label={`Remove ${label}`}
          >
            ✕
          </button>
        )}
        {hasPreview && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            style={{
              position: "absolute",
              bottom: 5,
              right: 5,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#D4A853",
              border: "none",
              color: "#000",
              fontSize: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              lineHeight: 1,
            }}
            aria-label={`Replace ${label}`}
          >
            ↺
          </button>
        )}
      </div>
      <span style={{ fontSize: 12, color: hasPreview ? "#D4A853" : "#c0c0c8", fontFamily: "'DM Sans', sans-serif" }}>
        {label}
      </span>
      <span style={{ fontSize: 10, color: "#606068", fontFamily: "'DM Sans', sans-serif" }}>{sub}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
