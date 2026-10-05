export const LOGO_SHAPES = ["custom", "circle", "shield", "hexa", "diamond"] as const;
export type LogoShape = typeof LOGO_SHAPES[number];

export const LOGO_SHAPE_LABELS: Record<LogoShape, string> = {
  custom: "Custom", circle: "Circle", shield: "Shield", hexa: "Hexa", diamond: "Diamond"
};

// Keep prompt wording editable alongside the template, rather than in code.
export const LOGO_COLOR_COMBOS = {
  YELLOW_WHITE: { primaryMetal: "yellow_gold", secondaryMetal: "white_gold", label: "yellow gold and white gold" },
  ROSE_WHITE: { primaryMetal: "rose_gold", secondaryMetal: "white_gold", label: "rose gold and white gold" },
  WHITE: { primaryMetal: "white_gold", secondaryMetal: null, label: "white gold" }
} as const;
export type LogoColorCombo = keyof typeof LOGO_COLOR_COMBOS;

export const LOGO_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const LOGO_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"] as const;
