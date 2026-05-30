import path from 'node:path';
import { z } from 'zod';
import pictureStylesData from '@/data/picture-pendant-styles.json';
import type { PictureStyleConfig } from './_types';

const PictureStyleSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  src: z.string().optional(),
  baseImage: z.string().min(1),
  maskImage: z.string().min(1),
  available: z.boolean().optional()
});

const styles = z.array(PictureStyleSchema).parse(pictureStylesData) as PictureStyleConfig[];

export function getPictureCompositeStyle(styleId: string): PictureStyleConfig {
  const style = styles.find(entry => entry.id === styleId);
  if (!style || style.available !== true) {
    throw new Error(`Picture pendant style is not configured: ${styleId}`);
  }
  return style;
}

export function resolvePublicAsset(assetPath: string) {
  return path.join(process.cwd(), assetPath);
}
