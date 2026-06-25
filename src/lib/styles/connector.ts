import path from 'node:path';
import fs from 'node:fs/promises';
import mime from 'mime';
import { resolveGenerationConfig, resolveGenerationConfigForModel } from '../providers';
import type { GeminiImageModelId } from '../generation-lab/models';
import { assertDurableMediaStorageConfigured, isR2Configured, uploadToR2 } from '../storage/r2';
import { isTextReferenceDescriptorPath, renderTextReferenceDescriptor } from './text-reference';

export type GenerateArgs = {
  prompt: string;
  attachments?: string[];
  requestId: string;
  variant: number;
  modelVariant?: number;
  modelIdOverride?: GeminiImageModelId;
  onPreparedAttachments?: (attachments: string[]) => void | Promise<void>;
};

const OUTPUT_DIR = process.env.GENERATED_IMAGE_DIR ?? path.join(process.cwd(), 'public', 'generated');
const GENERATION_TIMEOUT_MS = Number(process.env.GENERATION_TIMEOUT_MS ?? 90_000);

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`Image generation timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function saveGeneratedImage({ buffer, mimeType, requestId, variant }: { buffer: Buffer; mimeType: string; requestId: string; variant: number }) {
  const extension = mime.getExtension(mimeType) ?? 'png';
  const fileName = `${requestId}-v${variant}.${extension}`;

  if (isR2Configured()) {
    return uploadToR2({
      key: `generated/${fileName}`,
      body: buffer,
      contentType: mimeType
    });
  }

  assertDurableMediaStorageConfigured();
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const filePath = path.join(OUTPUT_DIR, fileName);
  await fs.writeFile(filePath, buffer);

  return `/generated/${fileName}`;
}

async function prepareProviderAttachments(attachments: string[]) {
  return Promise.all(
    attachments.map((attachment) => (
      isTextReferenceDescriptorPath(attachment)
        ? renderTextReferenceDescriptor(attachment)
        : attachment
    ))
  );
}

export async function generateImage({
  prompt,
  attachments = [],
  requestId,
  variant,
  modelVariant,
  modelIdOverride,
  onPreparedAttachments
}: GenerateArgs): Promise<{ imageUrl: string; modelId: string }> {
  const { provider, modelId, imageSize, aspectRatio } = modelIdOverride
    ? resolveGenerationConfigForModel(modelIdOverride)
    : resolveGenerationConfig(modelVariant ?? variant);
  const providerAttachments = await prepareProviderAttachments(attachments);
  await onPreparedAttachments?.(providerAttachments);

  const { buffer, mimeType } = await withTimeout(
    provider.generate({ prompt, attachments: providerAttachments, modelId, imageSize, aspectRatio }),
    GENERATION_TIMEOUT_MS
  );

  const imageUrl = await saveGeneratedImage({ buffer, mimeType, requestId, variant });

  return { imageUrl, modelId };
}
