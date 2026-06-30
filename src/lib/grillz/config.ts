export type GrillzStyleId =
  | "honeycomb_icedout"
  | "invisible_set"
  | "openface"
  | "solid_gold";

export type GrillzGoldColor = "yellow_gold" | "white_gold" | "rose_gold";
export type GrillzStoneType = "natural_diamonds" | "lab_diamonds" | "moissanite";
export type GrillzDiamondQuality = "vs" | "vvs";

export type GrillzStyle = {
  id: GrillzStyleId;
  label: string;
  description: string;
  src: string;
};

export const GRILLZ_STYLES: GrillzStyle[] = [
  {
    id: "honeycomb_icedout",
    label: "Honeycomb Icedout",
    description: "Handset diamond honeycomb grillz",
    src: "/grillz/styles/honeycomb-icedout.png"
  },
  {
    id: "invisible_set",
    label: "Invisible Set",
    description: "Full set invisible stone grillz",
    src: "/grillz/styles/invisible-set.png"
  },
  {
    id: "openface",
    label: "Openface",
    description: "Classic polished open-face grillz",
    src: "/grillz/styles/openface.png"
  },
  {
    id: "solid_gold",
    label: "Solid Gold",
    description: "Polished solid gold grillz",
    src: "/grillz/styles/solid-gold.png"
  }
];

export const GRILLZ_GOLD_COLORS: Array<{ id: GrillzGoldColor; label: string; summary: string }> = [
  { id: "yellow_gold", label: "Yellow Gold", summary: "yellow gold" },
  { id: "white_gold", label: "White Gold", summary: "white gold" },
  { id: "rose_gold", label: "Rose Gold", summary: "rose gold" }
];

export const GRILLZ_STONE_TYPES: Array<{ id: GrillzStoneType; label: string; summary: string }> = [
  { id: "natural_diamonds", label: "Natural Diamonds", summary: "natural diamonds" },
  { id: "lab_diamonds", label: "Lab Diamonds", summary: "lab diamonds" },
  { id: "moissanite", label: "Moissanite", summary: "moissanite stones" }
];

export const GRILLZ_DIAMOND_QUALITIES: Array<{ id: GrillzDiamondQuality; label: string }> = [
  { id: "vs", label: "VS" },
  { id: "vvs", label: "VVS" }
];

export type GrillzTooth = {
  id: string;
  arch: "upper" | "lower";
  position: number;
  label: string;
};

export const GRILLZ_TEETH: GrillzTooth[] = [
  ...Array.from({ length: 10 }, (_, index) => ({
    id: `U${index + 1}`,
    arch: "upper" as const,
    position: index + 1,
    label: `Upper ${index + 1}`
  })),
  ...Array.from({ length: 10 }, (_, index) => ({
    id: `L${index + 1}`,
    arch: "lower" as const,
    position: index + 1,
    label: `Lower ${index + 1}`
  }))
];

export const GRILLZ_PRESETS: Array<{ id: string; label: string; toothIds: string[] }> = [
  { id: "top_4", label: "4 top", toothIds: ["U4", "U5", "U6", "U7"] },
  { id: "bottom_2", label: "2 bottom", toothIds: ["L5", "L6"] },
  { id: "top_6", label: "6 top", toothIds: ["U3", "U4", "U5", "U6", "U7", "U8"] },
  { id: "bottom_6", label: "6 bottom", toothIds: ["L3", "L4", "L5", "L6", "L7", "L8"] },
  { id: "fangs", label: "fangs", toothIds: ["U2", "U9", "L2", "L9"] },
  { id: "top_6_bottom_6", label: "6 top + 6 bottom", toothIds: ["U3", "U4", "U5", "U6", "U7", "U8", "L3", "L4", "L5", "L6", "L7", "L8"] },
  { id: "top_8_bottom_8", label: "8 top + 8 bottom", toothIds: ["U2", "U3", "U4", "U5", "U6", "U7", "U8", "U9", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9"] },
  { id: "top_4_bottom_6", label: "4 top + 6 bottom", toothIds: ["U4", "U5", "U6", "U7", "L3", "L4", "L5", "L6", "L7", "L8"] },
  { id: "full_set", label: "full set", toothIds: ["U1", "U2", "U3", "U4", "U5", "U6", "U7", "U8", "U9", "U10", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10"] }
];
