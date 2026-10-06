import type { CSSProperties } from "react";
import { GRILLZ_TEETH, type GrillzGoldColor } from "@/src/lib/grillz/config";
import { cx } from "@/src/lib/theme/ui-classes";

const SELECTED_TOOTH_GRADIENTS: Record<GrillzGoldColor, string> = {
  yellow_gold: "linear-gradient(145deg,#f5d98b 0%,#d6a844 42%,#9d6a24 100%)",
  white_gold: "linear-gradient(145deg,#f8fbff 0%,#b7c1cc 44%,#737f8c 100%)",
  rose_gold: "linear-gradient(145deg,#eab39c 0%,#c98268 44%,#8f4d38 100%)"
};

const SELECTED_TOOTH_SHADOWS: Record<GrillzGoldColor, string> = {
  yellow_gold: "0 0 8px rgba(214,168,68,0.22)",
  white_gold: "0 0 8px rgba(213,221,230,0.2)",
  rose_gold: "0 0 8px rgba(201,130,104,0.22)"
};

const PSD_CANVAS = 1254;

type ToothLayer = {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const BASE_LAYER: ToothLayer = {
  id: "base",
  src: "/grillz/psd-layers/layer-01.png",
  x: 140,
  y: 279,
  width: 971,
  height: 716
};

const TOOTH_LAYERS: ToothLayer[] = [
  { id: "U1", src: "/grillz/psd-layers/layer-21.png", x: 172, y: 476, width: 48, height: 123 },
  { id: "U2", src: "/grillz/psd-layers/layer-20.png", x: 224, y: 469, width: 65, height: 147 },
  { id: "U3", src: "/grillz/psd-layers/layer-19.png", x: 291, y: 462, width: 86, height: 170 },
  { id: "U4", src: "/grillz/psd-layers/layer-18.png", x: 381, y: 462, width: 105, height: 177 },
  { id: "U5", src: "/grillz/psd-layers/layer-17.png", x: 491, y: 460, width: 132, height: 182 },
  { id: "U6", src: "/grillz/psd-layers/layer-16.png", x: 629, y: 460, width: 132, height: 182 },
  { id: "U7", src: "/grillz/psd-layers/layer-15.png", x: 765, y: 462, width: 108, height: 177 },
  { id: "U8", src: "/grillz/psd-layers/layer-14.png", x: 873, y: 462, width: 89, height: 170 },
  { id: "U9", src: "/grillz/psd-layers/layer-13.png", x: 963, y: 469, width: 67, height: 147 },
  { id: "U10", src: "/grillz/psd-layers/layer-12.png", x: 1028, y: 476, width: 51, height: 124 },
  { id: "L1", src: "/grillz/psd-layers/layer-11.png", x: 180, y: 644, width: 56, height: 117 },
  { id: "L2", src: "/grillz/psd-layers/layer-09.png", x: 237, y: 652, width: 73, height: 125 },
  { id: "L3", src: "/grillz/psd-layers/layer-10.png", x: 312, y: 661, width: 89, height: 133 },
  { id: "L4", src: "/grillz/psd-layers/layer-08.png", x: 407, y: 666, width: 100, height: 145 },
  { id: "L5", src: "/grillz/psd-layers/layer-07.png", x: 512, y: 668, width: 114, height: 150 },
  { id: "L6", src: "/grillz/psd-layers/layer-06.png", x: 625, y: 668, width: 115, height: 150 },
  { id: "L7", src: "/grillz/psd-layers/layer-05.png", x: 744, y: 666, width: 100, height: 146 },
  { id: "L8", src: "/grillz/psd-layers/layer-04.png", x: 849, y: 661, width: 90, height: 133 },
  { id: "L9", src: "/grillz/psd-layers/layer-03.png", x: 940, y: 652, width: 76, height: 125 },
  { id: "L10", src: "/grillz/psd-layers/layer-02.png", x: 1013, y: 644, width: 59, height: 117 }
];

function layerStyle(layer: ToothLayer): CSSProperties {
  return {
    left: `${(layer.x / PSD_CANVAS) * 100}%`,
    top: `${(layer.y / PSD_CANVAS) * 100}%`,
    width: `${(layer.width / PSD_CANVAS) * 100}%`,
    height: `${(layer.height / PSD_CANVAS) * 100}%`
  };
}

function maskStyle(layer: ToothLayer): CSSProperties {
  return {
    ...layerStyle(layer),
    WebkitMaskImage: `url(${layer.src})`,
    maskImage: `url(${layer.src})`,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat"
  };
}

export default function GrillzToothDiagram({
  selectedTeeth,
  goldColor,
  toggleTooth,
  compact = false
}: {
  selectedTeeth: string[];
  goldColor: GrillzGoldColor;
  toggleTooth?: (toothId: string) => void;
  compact?: boolean;
}) {
  const selected = new Set(selectedTeeth);

  return (
    <div
      role={toggleTooth ? undefined : "img"}
      aria-label={toggleTooth ? undefined : `Grillz positioning in ${goldColor.replaceAll("_", " ")}: ${GRILLZ_TEETH.filter(tooth => selected.has(tooth.id)).map(tooth => tooth.label).join(", ") || "No teeth selected"}`}
      className={cx("relative mx-auto aspect-square max-w-full", compact ? "w-[180px]" : "w-[285px]")}
    >
      <img
        src={BASE_LAYER.src}
        alt=""
        className="pointer-events-none absolute object-contain"
        style={layerStyle(BASE_LAYER)}
      />
      {TOOTH_LAYERS.map(layer => {
        const isSelected = selected.has(layer.id);
        const tooth = GRILLZ_TEETH.find(item => item.id === layer.id);
        return (
          <span key={layer.id}>
            <img
              src={layer.src}
              alt=""
              className={cx("pointer-events-none absolute object-contain transition", isSelected && "opacity-25")}
              style={layerStyle(layer)}
            />
            {isSelected ? (
              <span
                className="pointer-events-none absolute"
                style={{
                  ...maskStyle(layer),
                  background: SELECTED_TOOTH_GRADIENTS[goldColor],
                  boxShadow: SELECTED_TOOTH_SHADOWS[goldColor]
                }}
                aria-hidden
              />
            ) : null}
            {toggleTooth ? (
              <button
                type="button"
                aria-label={tooth?.label ?? layer.id}
                aria-pressed={isSelected}
                onClick={() => toggleTooth(layer.id)}
                className="absolute rounded-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[#2d8cff] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                style={layerStyle(layer)}
              />
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

