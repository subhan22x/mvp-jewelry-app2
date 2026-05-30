import path from 'node:path';
import sharp from 'sharp';
import { getPictureCompositeStyle, resolvePublicAsset } from './catalog';
import type { PictureCompositeInput, PreparedPictureComposite } from './_types';

type MaskInfo = {
  alpha: Buffer;
  width: number;
  height: number;
  bounds: { left: number; top: number; width: number; height: number };
};

const METAL_LABELS: Record<PictureCompositeInput['primaryMetal'], string> = {
  rose_gold: 'rose gold',
  white_gold: 'white gold',
  yellow_gold: 'yellow gold'
};

function isGreenMaskPixel(r: number, g: number, b: number) {
  return g > 120 && g > r * 1.35 && g > b * 1.2;
}

async function readGreenMask(maskPath: string): Promise<MaskInfo> {
  const { data, info } = await sharp(maskPath)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const alpha = Buffer.alloc(info.width * info.height);
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const pixelIndex = y * info.width + x;
      const sourceIndex = pixelIndex * info.channels;
      const r = data[sourceIndex];
      const g = data[sourceIndex + 1];
      const b = data[sourceIndex + 2];
      if (isGreenMaskPixel(r, g, b)) {
        alpha[pixelIndex] = 255;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error(`No green mask area found in ${path.basename(maskPath)}.`);
  }

  return {
    alpha,
    width: info.width,
    height: info.height,
    bounds: {
      left: minX,
      top: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    }
  };
}

function extractMaskBounds(mask: MaskInfo) {
  const { left, top, width, height } = mask.bounds;
  const bounded = Buffer.alloc(width * height);

  for (let y = 0; y < height; y += 1) {
    const sourceStart = (top + y) * mask.width + left;
    const targetStart = y * width;
    mask.alpha.copy(bounded, targetStart, sourceStart, sourceStart + width);
  }

  return bounded;
}

export function preparePictureComposite(input: PictureCompositeInput): PreparedPictureComposite {
  const style = getPictureCompositeStyle(input.styleId);
  const uploadFileName = input.uploadFileName?.trim() || path.basename(input.uploadedImagePath);

  return {
    variant: 1,
    style,
    uploadedImagePath: input.uploadedImagePath,
    prompt: JSON.stringify({
      role: 'deterministic_picture_pendant_composite',
      version: '1.0',
      styleId: style.id,
      styleLabel: style.label,
      uploadFileName,
      primaryMetal: input.primaryMetal,
      metalLabel: METAL_LABELS[input.primaryMetal],
      method: 'sharp_green_mask_composite',
      notes: 'User image is resized to cover the detected green mask area, clipped to that mask, and composited onto the plain pendant image. Metal color is stored for the request; v1 preserves the frame color from the seed image because no separate metal mask is available.'
    }, null, 2)
  };
}

export async function composePicturePendant(prepared: PreparedPictureComposite): Promise<{ buffer: Buffer; mimeType: string }> {
  const basePath = resolvePublicAsset(prepared.style.baseImage);
  const maskPath = resolvePublicAsset(prepared.style.maskImage);
  const mask = await readGreenMask(maskPath);
  const maskForBounds = extractMaskBounds(mask);

  const photoRgba = await sharp(prepared.uploadedImagePath)
    .rotate()
    .resize(mask.bounds.width, mask.bounds.height, { fit: 'cover', position: 'center' })
    .ensureAlpha()
    .raw()
    .toBuffer();

  for (let pixelIndex = 0; pixelIndex < maskForBounds.length; pixelIndex += 1) {
    photoRgba[pixelIndex * 4 + 3] = maskForBounds[pixelIndex];
  }

  const clippedPhoto = await sharp(photoRgba, {
    raw: {
      width: mask.bounds.width,
      height: mask.bounds.height,
      channels: 4
    }
  }).png().toBuffer();

  const buffer = await sharp(basePath)
    .rotate()
    .composite([
      {
        input: clippedPhoto,
        left: mask.bounds.left,
        top: mask.bounds.top
      }
    ])
    .png()
    .toBuffer();

  return { buffer, mimeType: 'image/png' };
}
