import { describe, expect, it } from 'vitest';
import { composePicturePendant, preparePictureComposite } from '../compositor';

describe('picture pendant compositor', () => {
  it('prepares deterministic composite metadata for a configured style', () => {
    const prepared = preparePictureComposite({
      userId: 'demo',
      styleId: 'pendant1',
      primaryMetal: 'yellow_gold',
      uploadedImagePath: 'public/samples/King slanted.png',
      uploadFileName: 'sample.png'
    });

    expect(prepared.variant).toBe(1);
    expect(prepared.style.label).toBe('Round Classic');
    expect(prepared.prompt).toContain('deterministic_picture_pendant_composite');
    expect(prepared.prompt).toContain('sharp_green_mask_composite');
  });

  it('composites a real uploaded image into the detected green mask', async () => {
    const prepared = preparePictureComposite({
      userId: 'demo',
      styleId: 'pendant1',
      primaryMetal: 'yellow_gold',
      uploadedImagePath: 'public/samples/King slanted.png',
      uploadFileName: 'sample.png'
    });

    const result = await composePicturePendant(prepared);

    expect(result.mimeType).toBe('image/png');
    expect(result.buffer.length).toBeGreaterThan(100_000);
  });

  it('fails clearly when a style is not configured', () => {
    expect(() => preparePictureComposite({
      userId: 'demo',
      styleId: 'missing-style',
      primaryMetal: 'yellow_gold',
      uploadedImagePath: 'public/samples/King slanted.png'
    })).toThrow(/not configured/i);
  });
});
