"use client";
import React from "react";
import Image from "next/image";
import { emblems } from "@/lib/assets";
import { cx, themeFocusRing } from "@/src/lib/theme/ui-classes";

type Props = {
  selected: string | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
};

export default function EmblemPicker({ selected, onSelect, disabled = false }: Props) {
  // Toggle layout for the 3+2 emblem grid; adjust spacing or ordering here if the mock changes.
  const topRow = emblems.slice(0, 3);
  const bottomRow = emblems.slice(3);

  return (
    <div className={`${disabled ? "pointer-events-none opacity-40" : ""} overflow-visible`}>
      <div className="flex justify-center gap-1.5 overflow-visible sm:gap-3">
        {topRow.map(asset => (
          <EmblemDiamond
            key={asset.id}
            assetId={asset.id}
            label={asset.label}
            src={asset.src}
            active={selected === asset.id}
            onSelect={onSelect}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-center gap-1.5 overflow-visible sm:mt-2 sm:gap-3">
        <div className="mr-6 sm:mr-8" />
        {bottomRow.map(asset => (
          <EmblemDiamond
            key={asset.id}
            assetId={asset.id}
            label={asset.label}
            src={asset.src}
            active={selected === asset.id}
            onSelect={onSelect}
          />
        ))}
        <div className="ml-6 sm:ml-8" />
      </div>
    </div>
  );
}

type EmblemDiamondProps = {
  assetId: string;
  label: string;
  src: string;
  active: boolean;
  onSelect: (id: string | null) => void;
};

const emblemDiamond = {
  button:
    "group relative flex h-[101px] w-[101px] flex-none items-center justify-center rounded-[27px] p-3 transition sm:h-28 sm:w-28 sm:rounded-[30px]",
  surface:
    "absolute inset-2 box-border rotate-45 rounded-[20px] border-2 bg-gradient-to-b from-black/80 via-black/85 to-black/60 shadow-[0_16px_28px_rgba(0,0,0,0.55)] transition sm:rounded-[22px]",
  selected:
    "border-[color:var(--theme-selected-border)] shadow-[0_0_18px_var(--theme-selected-glow),0_20px_34px_var(--theme-selected-glow)]",
  unselected: "border-transparent",
  imageFrame: "relative h-[75%] w-[75%]"
} as const;

const emblemArtOffset: Record<string, { x: string; y: string }> = {
  butterfly: { x: "3%", y: "1%" },
  crown: { x: "4%", y: "-5%" },
  heart: { x: "2%", y: "5.5%" },
  moneybag: { x: "-7.5%", y: "5%" },
  spade: { x: "-7.5%", y: "2.5%" }
};

function EmblemDiamond({ assetId, label, src, active, onSelect }: EmblemDiamondProps) {
  const artOffset = emblemArtOffset[assetId] ?? { x: "0%", y: "0%" };

  const handleClick = () => {
    onSelect(active ? null : assetId);
  };

  return (
    <button
      type="button"
      title={label}
      aria-pressed={active}
      onClick={handleClick}
      className={cx(emblemDiamond.button, themeFocusRing)}
    >
      <span
        className={cx(emblemDiamond.surface, active ? emblemDiamond.selected : emblemDiamond.unselected)}
        aria-hidden
      />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className={emblemDiamond.imageFrame}>
          <Image
            src={src}
            alt={label}
            fill
            sizes="(max-width: 480px) 145px, 160px"
            className="object-contain object-center"
            style={{ transform: `translate(${artOffset.x}, ${artOffset.y})` }}
          />
        </span>
      </span>
    </button>
  );
}
