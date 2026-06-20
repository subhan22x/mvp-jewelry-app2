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
import { scheduleBackgroundTask } from '@/src/lib/platform/background';
import { directUploadReferenceSchema, readDirectUpload } from '@/src/lib/storage/direct-upload';
import { resolveAccountIdFromSlug } from '@/src/lib/tenant';
import { consumeUsageCredit, ensureUsageAvailable, usageErrorResponse } from '@/src/lib/usage';
import { ensureDraftQuoteForRequest } from '@/src/lib/quotes/ensure-draft-quote';

export const maxDuration = 300;

const MAX_UPLOAD_BYTES = Number(process.env.PICTURE_UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024);

const Fields = z.object({
  userId: z.string().min(1),
  accountSlug: z.string().min(1).optional(),
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

function uploadExtension(file: { name: string; type: string }) {
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
    const isJson = req.headers?.get?.('content-type')?.includes('application/json');
    const form = isJson ? null : await req.formData();
    const json = isJson ? await req.json() : null;
    const parsed = Fields.parse(isJson ? json : {
      userId: form!.get('userId'),
      styleId: form!.get('styleId'),
      accountSlug: form!.get('accountSlug') || undefined,
      primaryMetal: form!.get('primaryMetal')
    });
    const accountId = await resolveAccountIdFromSlug(parsed.accountSlug) ?? getDefaultAccountId();
    await ensureUsageAvailable(accountId, 'design_image_generated');

    const imageValue = form?.get('image');
    const directImage = isJson ? directUploadReferenceSchema.parse(json?.imageUpload) : null;
    if (directImage && !directImage.key.startsWith('incoming/picture-pendant/')) {
      return jsonError('Uploaded file purpose does not match this request.');
    }
    if (!directImage && (!imageValue || typeof imageValue === 'string')) {
      return jsonError('Please upload an image for the picture pendant.');
    }

    const image = imageValue as File | undefined;
    const imageType = directImage?.contentType ?? image!.type;
    const imageSize = directImage?.size ?? image!.size;
    const imageName = directImage?.originalName ?? image!.name;
    if (!imageType.startsWith('image/')) {
      return jsonError('Uploaded file must be an image.');
    }
    if (imageSize <= 0) {
      return jsonError('Uploaded image is empty.');
    }
    if (imageSize > MAX_UPLOAD_BYTES) {
      return jsonError(`Uploaded image must be ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB or smaller.`);
    }

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'picture-pendant-'));
    const tempImagePath = path.join(tempDir, `upload.${uploadExtension({ name: imageName, type: imageType })}`);
    const imageBuffer = directImage ? (await readDirectUpload(directImage)).buffer : Buffer.from(await image!.arrayBuffer());
    await fs.writeFile(tempImagePath, imageBuffer);

    const prepared = preparePictureComposite({
      userId: parsed.userId,
      styleId: parsed.styleId,
      primaryMetal: parsed.primaryMetal,
      uploadedImagePath: tempImagePath,
      uploadFileName: imageName
    });

    const request = await prisma.request.create({
      data: {
        accountId,
        userId: parsed.userId,
        productType: 'picture',
        styleId: parsed.styleId,
        text: imageName || 'Picture pendant image',
        twoTone: false,
        primaryMetal: parsed.primaryMetal,
        secondaryMetal: null,
        emblem: 'none',
        uploadFileName: imageName || null
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

    scheduleBackgroundTask((async () => {
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
        const updated = await prisma.result.update({
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
        await consumeUsageCredit({
          accountId,
          kind: 'design_image_generated',
          sourceType: 'Result',
          sourceId: updated.id,
          metadata: { requestId: request.id, productType: 'picture' }
        });
        await ensureDraftQuoteForRequest(request.id).catch(error => {
          console.error(`[quote draft ${request.id}] automatic creation failed:`, error);
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
    })(), `picture-request:${request.id}`);

    return NextResponse.json({ requestId: request.id }, { status: 201 });
  } catch (err: any) {
    await removeTempDir(tempDir);
    const usage = usageErrorResponse(err);
    if (usage) return jsonError(usage.error, 402);
    const message = err instanceof z.ZodError ? err.issues[0]?.message ?? 'Invalid picture pendant request.' : err.message ?? 'bad_request';
    return jsonError(message);
  }
}
