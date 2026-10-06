import manifest from './manifest.generated.json';
import type { ThumbnailEntry } from './types';
export type ThumbnailId = keyof typeof manifest.entries;
const entries = manifest.entries as unknown as Record<ThumbnailId, ThumbnailEntry>;
const bySource = new Map(Object.entries(entries).map(([id, entry]) => [entry.source, id as ThumbnailId]));
export function thumbnailIdForSource(source: string): ThumbnailId {
  const id = bySource.get(source);
  if (!id) throw new Error(`Unregistered static thumbnail: ${source}. Register the flow in scripts/thumbnails/catalog.ts and run npm run thumbnails.`);
  return id;
}
export function thumbnailEntry(id: ThumbnailId): ThumbnailEntry {
  const entry = entries[id];
  if (!entry) throw new Error(`Unknown static thumbnail ID: ${id}`);
  return entry;
}
