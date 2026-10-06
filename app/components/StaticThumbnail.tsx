import type { CSSProperties, ImgHTMLAttributes } from 'react';
import { thumbnailEntry, type ThumbnailId } from '@/src/lib/thumbnails/browser';
type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'width' | 'height'> & {
  assetId: ThumbnailId; alt: string; fill?: boolean; priority?: boolean; width?: number; height?: number;
};
export default function StaticThumbnail({ assetId, fill = false, priority = false, sizes = '100vw', style, loading, width, height, ...props }: Props) {
  const entry = thumbnailEntry(assetId);
  const variants = entry.kind === 'raster' ? entry.variants : [];
  const fallback = variants.find(v => v.width >= 320) ?? variants[variants.length - 1];
  const fillStyle: CSSProperties | undefined = fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%' } : undefined;
  return <img {...props} src={entry.kind === 'vector' ? entry.url : fallback.url}
    srcSet={entry.kind === 'raster' ? variants.map(v => `${v.url} ${v.width}w`).join(', ') : undefined}
    sizes={entry.kind === 'raster' ? sizes : undefined} width={width ?? entry.width} height={height ?? entry.height}
    loading={priority ? 'eager' : loading ?? 'lazy'} fetchPriority={priority ? 'high' : undefined}
    decoding="async" style={{ ...fillStyle, ...style }} data-thumbnail-id={assetId} />;
}
