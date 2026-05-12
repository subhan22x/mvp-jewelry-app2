import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import mime from 'mime';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/db/client';
import { composePicturePendant, preparePictureComposite } from '@/lib/picture-styles/compositor';
import { saveGeneratedImage } from '@/lib/styles/connector';
import { getDefaultAccountId } from '@/src/lib/account';

const MAX_UPLOAD_BYTES = Number(process.env.PICTURE_UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024);

const Fields = z.object({
  userId: z.string().min(1),
  styleId: z.string().min(1),
  primaryMetal: z.enum(['rose_gold', 'white_gold', 'yellow_gold'])
});

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getGenerationErrorMessage(err: unknown): string {
  const fallback = 'Image generation failed.';
  if (!(err instanceof Error)) return fallback;

  const match = err.message.match(/\{.*\}/s);
  if (!match) return err.message || fallback;

  try {
    const parsed = JSON.parse(match[0]);
    const message = parsed?.error?.message ?? parsed?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
  } catch {
    return err.message || fallback;
  }
}

function uploadExtension(file: File) {
  const fromMime = mime.getExtension(file.type);
  if (fromMime) return fromMime;

  const fromName = path.extname(file.name).replace(/^\./, '').toLowerCase();
  return fromName || 'png';
}

async function removeTempDir(tempDir: string | null) {
  if (!tempDir) return;
  await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
}

export async function POST(req: Request) {
  let tempDir: string | null = null;

  try {
    const form = await req.formData();
    const parsed = Fields.parse({
      userId: form.get('userId'),
      styleId: form.get('styleId'),
      primaryMetal: form.get('primaryMetal')
    });
    const accountId = getDefaultAccountId();

    const imageValue = form.get('image');
    if (!imageValue || typeof imageValue === 'string') {
      return jsonError('Please upload an image for the picture pendant.');
    }

    const image = imageValue as File;
    if (!image.type.startsWith('image/')) {
      return jsonError('Uploaded file must be an image.');
    }
    if (image.size <= 0) {
      return jsonError('Uploaded image is empty.');
    }
    if (image.size > MAX_UPLOAD_BYTES) {
      return jsonError(`Uploaded image must be ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB or smaller.`);
    }

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'picture-pendant-'));
    const tempImagePath = path.join(tempDir, `upload.${uploadExtension(image)}`);
    await fs.writeFile(tempImagePath, Buffer.from(await image.arrayBuffer()));

    const prepared = preparePictureComposite({
      userId: parsed.userId,
      styleId: parsed.styleId,
      primaryMetal: parsed.primaryMetal,
      uploadedImagePath: tempImagePath,
      uploadFileName: image.name
    });

    const request = await prisma.request.create({
      data: {
        accountId,
        userId: parsed.userId,
        productType: 'picture',
        styleId: parsed.styleId,
        text: image.name || 'Picture pendant image',
        twoTone: false,
        primaryMetal: parsed.primaryMetal,
        secondaryMetal: null,
        emblem: 'none',
        uploadFileName: image.name || null
      }
    });

    const startedAt = new Date();
    const attempt = await prisma.result.create({
      data: {
        accountId,
        requestId: request.id,
        variant: prepared.variant,
        prompt: prepared.prompt,
        status: 'pending',
        startedAt
      }
    });

    const tempDirForGeneration = tempDir;
    tempDir = null;

    void (async () => {
      const startedMs = attempt.startedAt?.getTime() ?? Date.now();
      try {
        const { buffer, mimeType } = await composePicturePendant(prepared);
        const imageUrl = await saveGeneratedImage({
          buffer,
          mimeType,
          requestId: request.id,
          variant: prepared.variant
        });
        const completedAt = new Date();
        await prisma.result.update({
          where: { id: attempt.id },
          data: {
            imageUrl,
            modelId: 'sharp-green-mask-composite-v1',
            status: 'succeeded',
            error: null,
            completedAt,
            durationMs: Math.max(0, completedAt.getTime() - startedMs)
          }
        });
      } catch (err) {
        console.error('[picture pendant] generation failed:', err);
        const completedAt = new Date();
        await prisma.result.update({
          where: { id: attempt.id },
          data: {
            status: 'failed',
            error: getGenerationErrorMessage(err),
            completedAt,
            durationMs: Math.max(0, completedAt.getTime() - startedMs)
          }
        });
      } finally {
        await removeTempDir(tempDirForGeneration);
      }
    })();

    return NextResponse.json({ requestId: request.id }, { status: 201 });
  } catch (err: any) {
    await removeTempDir(tempDir);
    const message = err instanceof z.ZodError ? err.issues[0]?.message ?? 'Invalid picture pendant request.' : err.message ?? 'bad_request';
    return jsonError(message);
  }
}
