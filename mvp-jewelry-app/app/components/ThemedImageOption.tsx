"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { imageOptionButtonClass, styleOptionFrameClass } from "@/src/lib/theme/ui-classes";

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
  className = styleOptionFrameClass,
  imageSizes = "(max-width: 640px) 210px, 260px",
  fallback,
  badge
}: ThemedImageOptionProps) {
  return (
    <div className={`relative flex-none ${className}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={selected}
        aria-label={label}
        className={imageOptionButtonClass({ selected, disabled })}
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
