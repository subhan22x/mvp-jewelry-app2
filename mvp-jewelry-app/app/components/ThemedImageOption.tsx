"use client";

import Image from "next/image";
import type { ReactNode } from "react";

type ThemedImageOptionProps = {
  label: string;
  src?: string | null;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  imageSizes?: string;
  fallback?: ReactNode;
  badge?: ReactNode;
};

export default function ThemedImageOption({
  label,
  src,
  selected,
  disabled = false,
  onClick,
  className = "h-[184px] w-[184px] rounded-[30px]",
  imageSizes = "(max-width: 640px) 210px, 260px",
  fallback,
  badge
}: ThemedImageOptionProps) {
  const stateClass = selected
    ? "border-[3px] border-[color:var(--theme-selected-border)]"
    : "border-2 border-[color:var(--theme-border)]";

  return (
    <div className={`relative flex-none ${className}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={selected}
        aria-label={label}
        className={`group relative h-full w-full box-border overflow-hidden rounded-[inherit] bg-[var(--theme-surface-muted)] transition hover:border-[color:var(--theme-border-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-selected-border)] ${stateClass} ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
      >
        {src ? (
          <Image
            src={src}
            alt={label}
            fill
            sizes={imageSizes}
            className="object-cover object-center transition duration-500 group-hover:scale-105"
          />
        ) : (
          fallback
        )}
        <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-transparent via-transparent to-black/35" aria-hidden />
        {badge}
      </button>
    </div>
  );
}
