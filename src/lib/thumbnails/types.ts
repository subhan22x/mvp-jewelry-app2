export type RasterThumbnail = { kind: 'raster'; source: string; width: number; height: number; variants: Array<{ width: number; height: number; url: string; bytes: number; hash: string }> };
export type VectorThumbnail = { kind: 'vector'; source: string; width: number; height: number; url: string; bytes: number; hash: string };
export type ThumbnailEntry = RasterThumbnail | VectorThumbnail;
