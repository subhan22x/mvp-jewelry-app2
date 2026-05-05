import fs from 'node:fs/promises';
import { GoogleGenAI } from '@google/genai';
import mime from 'mime';
import type { ImageProvider, ProviderGenerateArgs, ProviderResult } from './types';

export class GoogleProvider implements ImageProvider {
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generate({ prompt, attachments, modelId, imageSize }: ProviderGenerateArgs): Promise<ProviderResult> {
    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
      { text: prompt }
    ];

    if (attachments.length) {
      const attachmentParts = await Promise.all(
        attachments.map(async (filePath) => {
          const data = await fs.readFile(filePath);
          const mimeType = mime.getType(filePath) ?? 'application/octet-stream';
          return { inlineData: { data: data.toString('base64'), mimeType } };
        })
      );
      parts.push(...attachmentParts);
    }

    const response = await this.client.models.generateContent({
      model: modelId,
      contents: [{ role: 'user', parts }],
      config: {
        responseModalities: ['IMAGE'],
        ...(imageSize ? { imageConfig: { imageSize } } : {})
      }
    });

    const candidates = response.candidates ?? [];
    const inlineParts = candidates
      .flatMap(c => c.content?.parts ?? [])
      .filter((p): p is { inlineData: { data: string; mimeType?: string } } => Boolean(p.inlineData?.data));

    if (!inlineParts.length) {
      throw new Error('Google GenAI response did not include image data.');
    }

    const mimeType = inlineParts[0].inlineData.mimeType ?? 'image/png';
    return { buffer: Buffer.from(inlineParts[0].inlineData.data, 'base64'), mimeType };
  }
}
