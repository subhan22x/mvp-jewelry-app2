export type ProviderGenerateArgs = {
  prompt: string;
  attachments: string[];
  modelId: string;
  imageSize?: '512' | '1K' | '2K' | '4K';
};

export type ProviderResult = { buffer: Buffer; mimeType: string };

export interface ImageProvider {
  generate(args: ProviderGenerateArgs): Promise<ProviderResult>;
}
