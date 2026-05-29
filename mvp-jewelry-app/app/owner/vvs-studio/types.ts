export type VvsUploadedFile = {
  uploadId?: string;
  localFile?: File;
  previewUrl?: string;
  normalizedImageUrl?: string;
  status: "local" | "uploading" | "uploaded" | "failed";
  error?: string;
};

export type VvsWizardStep =
  | "capture"
  | "details"
  | "theme"
  | "generatingImage"
  | "imageResult"
  | "generatingVideo"
  | "videoResult";

export type VvsVisualStyle = "dark" | "marble" | "street" | "velvet" | "ice";
export type VvsPieceType = "pendant" | "ring" | "chainz" | "grills" | "band";
export type VvsMetalType = "10k_gold" | "14k_gold" | "18k_gold" | "silver";
export type VvsGoldColor = "yellow_gold" | "white_gold" | "rose_gold";
export type VvsStoneSetting = "micro_pave" | "flooded" | "baguette" | "invisible";
export type VvsMood = "luxury" | "street" | "editorial" | "minimal";
export type VvsAspectRatio = "story";
export type VvsVideoDurationSeconds = 6 | 10;
export type VvsImageProvider = "openai" | "gemini";

export type VvsWizardState = {
  step: VvsWizardStep;
  shootId?: string;
  imageGenerationId?: string;
  videoGenerationId?: string;
  pieceType?: VvsPieceType;
  uploads: {
    top?: VvsUploadedFile;
    left?: VvsUploadedFile;
    right?: VvsUploadedFile;
  };
  visualStyle?: VvsVisualStyle;
  metalType?: VvsMetalType;
  goldColor?: VvsGoldColor;
  diamondWeight?: string;
  engravingText?: string;
  price?: string;
  stoneSetting?: VvsStoneSetting;
  mood?: VvsMood;
  aspectRatio?: VvsAspectRatio;
  videoDurationSeconds: VvsVideoDurationSeconds;
  imageProvider: VvsImageProvider;
  imageModelId: string;
  generatedImageUrl?: string;
  generatedVideoUrl?: string;
  error?: string;
};

export const DEFAULT_STATE: VvsWizardState = {
  step: "capture",
  uploads: {},
  aspectRatio: "story",
  videoDurationSeconds: 6,
  imageProvider: "gemini",
  imageModelId: "gemini-3-pro-image-preview",
};
