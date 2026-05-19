export type VvsImageProvider = "openai" | "gemini";

export type VvsStudioPromptInput = {
  pieceType?: string;
  mood?: string;
  visualStyle?: string;
  aspectRatio?: string;
  metalType?: string;
  goldColor?: string;
  engravingText?: string;
  priceLabel?: string;
  stoneSetting?: string;
  diamondWeight?: string;
};

export type VvsStudioVideoPromptInput = {
  pieceType?: string;
  mood?: string;
  aspectRatio?: string;
};

export type VvsGenerateImageInput = {
  provider: VvsImageProvider;
  modelId: string;
  prompt: string;
  // One to three normalized source uploads read server-side.
  attachments: Array<{
    buffer: Buffer;
    mimeType: string;
    fileName: string;
  }>;
  generationId: string;
};

export type VvsGenerateImageResult = {
  imageUrl: string;
  modelId: string;
};
