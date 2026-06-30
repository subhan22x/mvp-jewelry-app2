import { NECKLACE_METAL_LABELS, type NecklaceMetalColor } from "./config";

export const NECKLACE_PENDANT_PROMPT =
  "attach this pendant to it, attach only the pendant not anything else in the image, keep the construction and lighting realistic";

export function buildNecklacePrompt({ metalColor }: { metalColor: NecklaceMetalColor }) {
  return `${NECKLACE_PENDANT_PROMPT}

Keep the necklace style, ${NECKLACE_METAL_LABELS[metalColor]} color, black mannequin, black shirt, camera angle, lighting, and product-photo framing from the necklace reference.`;
}
