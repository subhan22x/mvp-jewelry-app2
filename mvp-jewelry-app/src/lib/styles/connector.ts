import path from 'node:path';
import fs from 'node:fs/promises';
import { GoogleGenAI } from '@google/genai';
import mime from 'mime';

export type GenerateArgs = {
  prompt: string;
  attachments?: string[];
  requestId: string;
  variant: number;
};

const MODEL_ID = process.env.GEMINI_MODEL_ID ?? 'gemini-3.1-flash-image-preview';
const OUTPUT_DIR = process.env.GENERATED_IMAGE_DIR ?? path.join(process.cwd(), 'public', 'generated');

let cachedClient: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!cachedClient) {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.IMAGE_API_KEY;
    if (!apiKey) throw new Error('Missing Gemini API key. Set GEMINI_API_KEY.');
    cachedClient = new GoogleGenAI({ apiKey });
  }
  return cachedClient;
}

export async function generateImage({ prompt, attachments = [], requestId, variant }: GenerateArgs): Promise<{ imageUrl: string }> {
  const ai = getClient();

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

  const response = await ai.models.generateContent({
    model: MODEL_ID,
    contents: [
      {
        role: 'user',
        parts
      }
    ],
    config: {
      responseModalities: ['IMAGE']
    }
  });

  const candidates = response.candidates ?? [];
  const inlineParts = candidates.flatMap((candidate) => candidate.content?.parts ?? [])
    .filter((part): part is { inlineData: { data: string; mimeType?: string } } => Boolean(part.inlineData?.data));

  if (!inlineParts.length) {
    throw new Error('Gemini response did not include image data.');
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const [primaryPart] = inlineParts;
  const mimeType = primaryPart.inlineData.mimeType ?? 'image/png';
  const extension = mime.getExtension(mimeType) ?? 'png';
  const fileName = `${requestId}-v${variant}.${extension}`;
  const filePath = path.join(OUTPUT_DIR, fileName);
  const buffer = Buffer.from(primaryPart.inlineData.data, 'base64');

  await fs.writeFile(filePath, buffer);

  const publicPath = `/generated/${fileName}`;
  return { imageUrl: publicPath };
}
