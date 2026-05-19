import type { VvsStudioPromptInput, VvsStudioVideoPromptInput } from "./types";

// Barebones placeholder — prompts will be replaced with full templates later.
export function buildVvsStudioImagePrompt(input: VvsStudioPromptInput): string {
  return [
    "Create a studio-quality jewelry marketing image.",
    input.pieceType ? `Piece type: ${input.pieceType}.` : "",
    input.mood ? `Mood: ${input.mood}.` : "",
    input.visualStyle ? `Visual style: ${input.visualStyle}.` : "",
    input.aspectRatio ? `Aspect ratio: ${input.aspectRatio}.` : "",
    input.metalType ? `Metal: ${input.metalType.replace(/_/g, " ")}.` : "",
    input.goldColor ? `Gold color: ${input.goldColor.replace(/_/g, " ")}.` : "",
    input.stoneSetting ? `Stone setting: ${input.stoneSetting.replace(/_/g, " ")}.` : "",
    input.diamondWeight ? `Diamond weight: ${input.diamondWeight}.` : "",
    input.engravingText ? `Text/engraving: ${input.engravingText}.` : "",
    input.priceLabel ? `Price: ${input.priceLabel}.` : "",
    "Use the attached source image(s) as geometry and material references.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildVvsStudioVideoPrompt(input: VvsStudioVideoPromptInput): string {
  return [
    "Create a premium jewelry marketing reel from the provided studio image.",
    input.pieceType ? `Piece type: ${input.pieceType}.` : "",
    input.mood ? `Mood: ${input.mood}.` : "",
    input.aspectRatio ? `Aspect ratio: ${input.aspectRatio}.` : "",
    "Use subtle camera motion, polished light sweeps, and luxury product-video pacing.",
  ]
    .filter(Boolean)
    .join("\n");
}
