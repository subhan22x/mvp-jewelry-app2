export const GEMINI_IMAGE_MODELS = [
  { id: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image", imageSize: "1K" as const, aspectRatio: "9:16" as const },
  { id: "gemini-3.1-flash-image", label: "Gemini 3.1 Flash Image", imageSize: "1K" as const, aspectRatio: "9:16" as const },
  { id: "gemini-3-pro-image-preview", label: "Gemini 3 Pro Image", imageSize: "2K" as const, aspectRatio: "9:16" as const }
] as const;

export type GeminiImageModelId = (typeof GEMINI_IMAGE_MODELS)[number]["id"];

export function isGeminiImageModelId(value: string): value is GeminiImageModelId {
  return GEMINI_IMAGE_MODELS.some(model => model.id === value);
}
