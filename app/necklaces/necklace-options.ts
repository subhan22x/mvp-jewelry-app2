export type NecklaceStyleId = "slim_cuban" | "cuban" | "fat_cuban" | "spiked_cuban" | "figaro" | "baguette_tennis" | "multi_style" | "upload_inspo";

export type NecklaceStyle = {
  id: NecklaceStyleId;
  label: string;
  thumb?: string;
  promptImage?: string;
  available: boolean;
  upload?: boolean;
};

export const NECKLACE_STYLES: NecklaceStyle[] = [
  { id: "slim_cuban", label: "Slim Cuban", thumb: "/necklaces/styles/slim-cuban-thumbnail.png", promptImage: "/necklaces/prompt/slim-cuban-prompt-reference.png", available: true },
  { id: "cuban", label: "Cuban", thumb: "/necklaces/styles/cuban-thumbnail.png", promptImage: "/necklaces/prompt/cuban-yellow-gold-prompt-reference.png", available: true },
  { id: "fat_cuban", label: "Fat Cuban", thumb: "/necklaces/styles/fat-cuban-thumbnail.png", promptImage: "/necklaces/prompt/fat-cuban-prompt-reference.png", available: true },
  { id: "spiked_cuban", label: "Spiked Cuban", thumb: "/necklaces/styles/spiked-cuban-thumbnail.png", promptImage: "/necklaces/prompt/spiked-cuban-rose-gold-prompt-reference.png", available: true },
  { id: "figaro", label: "Figaro", thumb: "/necklaces/styles/figaro-thumbnail.png", available: true },
  { id: "baguette_tennis", label: "Baguette Tennis", thumb: "/necklaces/styles/baguette-tennis-thumbnail.png", promptImage: "/necklaces/prompt/baguette-tennis-white-gold-prompt-reference.png", available: true },
  { id: "multi_style", label: "Multi-style", thumb: "/necklaces/styles/multi-style-thumbnail.png", promptImage: "/necklaces/prompt/multi-style-prompt-reference.png", available: true },
  { id: "upload_inspo", label: "Upload Inspo", available: true, upload: true }
];

export function getNecklaceStyle(styleId: string | undefined) {
  return NECKLACE_STYLES.find(style => style.id === styleId && style.available);
}
