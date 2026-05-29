export type ProviderGenerateArgs = {
  prompt: string;
  attachments: string[];
  modelId: string;
  imageSize?: '512' | '1K' | '2K' | '4K';
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9';
};

export type ProviderResult = { buffer: Buffer; mimeType: string };

export interface ImageProvider {
  generate(args: ProviderGenerateArgs): Promise<ProviderResult>;
}
