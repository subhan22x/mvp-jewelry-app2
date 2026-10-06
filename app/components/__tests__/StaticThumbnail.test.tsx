import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StaticThumbnail from '../StaticThumbnail';
import { thumbnailIdForSource } from '@/src/lib/thumbnails/browser';
describe('StaticThumbnail', () => {
  it('renders responsive static files, priority and preserved presentation', () => {
    render(<StaticThumbnail assetId="grillz.invisible_set" alt="Invisible set" fill priority sizes="180px" style={{ transform: 'translate(4%, -5%)' }} />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toMatch(/^\/thumbnails\/.+\.webp$/);
    expect(img.getAttribute('srcset')).toContain('320w'); expect(img.getAttribute('sizes')).toBe('180px');
    expect(img.getAttribute('loading')).toBe('eager'); expect(img.getAttribute('fetchpriority')).toBe('high');
    expect(img.style.position).toBe('absolute'); expect(img.style.transform).toBe('translate(4%, -5%)');
  });
  it('renders a vector without misleading raster descriptors', () => {
    render(<StaticThumbnail assetId="category.grillz" alt="Grillz" />);
    expect(screen.getByRole('img').getAttribute('src')).toMatch(/\.svg$/);
    expect(screen.getByRole('img')).not.toHaveAttribute('srcset');
  });
  it('fails visibly for unregistered sources rather than downloading originals', () => {
    expect(() => thumbnailIdForSource('/new-flow/unregistered.png')).toThrow('Unregistered');
  });
});
