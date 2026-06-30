import path from "node:path";

export type NecklaceStyleId =
  | "slim_cuban"
  | "cuban"
  | "fat_cuban"
  | "spiked_cuban"
  | "figaro"
  | "baguette_tennis"
  | "multi_style";

export type NecklaceMetalColor = "yellow_gold" | "white_gold" | "rose_gold";
export type NecklaceStoneType = "vvs_moissanite" | "natural_diamond" | "lab_diamond" | "cz";
export type NecklaceSize = "18" | "20" | "22" | "30";

export type NecklaceStyleConfig = {
  id: NecklaceStyleId;
  label: string;
  references: Record<NecklaceMetalColor, string>;
};

export const NECKLACE_METAL_LABELS: Record<NecklaceMetalColor, string> = {
  yellow_gold: "Yellow Gold",
  white_gold: "White Gold",
  rose_gold: "Rose Gold"
};

export const NECKLACE_STONE_LABELS: Record<NecklaceStoneType, string> = {
  vvs_moissanite: "VVS Moissanite",
  natural_diamond: "Natural Diamond",
  lab_diamond: "Lab Diamond",
  cz: "CZ"
};

export const NECKLACE_STYLES: NecklaceStyleConfig[] = [
  {
    id: "slim_cuban",
    label: "Slim Cuban",
    references: {
      yellow_gold: "/necklaces/references/slim-cuban-yellow-gold.jpeg",
      white_gold: "/necklaces/references/slim-cuban-white-gold.png",
      rose_gold: "/necklaces/references/slim-cuban-rose-gold.jpeg"
    }
  },
  {
    id: "cuban",
    label: "Cuban",
    references: {
      yellow_gold: "/necklaces/references/cuban-yellow-gold.png",
      white_gold: "/necklaces/references/cuban-white-gold.jpeg",
      rose_gold: "/necklaces/references/cuban-rose-gold.jpeg"
    }
  },
  {
    id: "fat_cuban",
    label: "Fat Cuban",
    references: {
      yellow_gold: "/necklaces/references/fat-cuban-yellow-gold.png",
      white_gold: "/necklaces/references/fat-cuban-white-gold.jpeg",
      rose_gold: "/necklaces/references/fat-cuban-rose-gold.jpeg"
    }
  },
  {
    id: "spiked_cuban",
    label: "Spiked Cuban",
    references: {
      yellow_gold: "/necklaces/references/spiked-cuban-yellow-gold.jpeg",
      white_gold: "/necklaces/references/spiked-cuban-white-gold.jpeg",
      rose_gold: "/necklaces/references/spiked-cuban-rose-gold.png"
    }
  },
  {
    id: "figaro",
    label: "Figaro",
    references: {
      yellow_gold: "/necklaces/references/figaro-yellow-gold.jpeg",
      white_gold: "/necklaces/references/figaro-white-gold.png",
      rose_gold: "/necklaces/references/figaro-rose-gold.png"
    }
  },
  {
    id: "baguette_tennis",
    label: "Baguette Tennis",
    references: {
      yellow_gold: "/necklaces/references/baguette-tennis-yellow-gold.png",
      white_gold: "/necklaces/references/baguette-tennis-white-gold.jpeg",
      rose_gold: "/necklaces/references/baguette-tennis-rose-gold.jpeg"
    }
  },
  {
    id: "multi_style",
    label: "Multi-style",
    references: {
      yellow_gold: "/necklaces/references/multi-style-yellow-gold.png",
      white_gold: "/necklaces/references/multi-style-white-gold.png",
      rose_gold: "/necklaces/references/multi-style-rose-gold.jpeg"
    }
  }
];

export function getNecklaceStyleConfig(styleId: string) {
  return NECKLACE_STYLES.find(style => style.id === styleId);
}

export function necklaceReferenceUrl(styleId: NecklaceStyleId, metalColor: NecklaceMetalColor) {
  return getNecklaceStyleConfig(styleId)?.references[metalColor] ?? null;
}

export function necklaceReferencePath(styleId: NecklaceStyleId, metalColor: NecklaceMetalColor) {
  const url = necklaceReferenceUrl(styleId, metalColor);
  return url ? path.join(process.cwd(), "public", url.replace(/^\/+/, "")) : null;
}
