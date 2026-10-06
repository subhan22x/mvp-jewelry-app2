import nameStyles from '../../data/pendant-styles.json';
import pictureStyles from '../../data/picture-pendant-styles.json';
import { GRILLZ_STYLES } from '../../src/lib/grillz/config';
import { NECKLACE_STYLES } from '../../app/necklaces/necklace-options';
import { PLAIN_STYLES, BRACELET_STYLES, WOMENS_STYLES, SHAPES, SIZE_OPTIONS, categories, pendantCards, braceletCards, emblems } from '../../src/lib/thumbnails/flow-assets';

export type ThumbnailSource = { id: string; src: string; profile: 'icon' | 'picker' | 'preview'; quality?: number };
const sources: ThumbnailSource[] = [];
function register(prefix: string, entries: ReadonlyArray<{ id: string; src?: string; thumb?: string; iconSrc?: string; guide?: string }>, profile: ThumbnailSource['profile']) {
  for (const entry of entries) {
    const src = entry.src || entry.thumb || entry.iconSrc || entry.guide;
    if (src) sources.push({ id: `${prefix}.${entry.id}`, src, profile });
  }
}
// Match browser visibility: name filters hidden styles; picture renders disabled cards too.
register('name', nameStyles.filter(style => style.available !== false), 'preview');
register('picture', pictureStyles, 'preview');
register('plain', PLAIN_STYLES, 'preview');
register('grillz', GRILLZ_STYLES, 'preview');
register('bracelet.icedout', BRACELET_STYLES, 'preview');
register('bracelet.womens', WOMENS_STYLES, 'preview');
register('necklace.picker', NECKLACE_STYLES.filter(style => style.available), 'picker');
register('necklace.guide', SIZE_OPTIONS, 'preview');
register('logo.shape', SHAPES, 'icon');
register('emblem', emblems, 'icon');
register('category', categories, 'icon');
register('pendant.category', pendantCards, 'picker');
register('bracelet.category', braceletCards, 'picker');
sources.push({ id: 'plain.chain-guide', src: '/plain-pendants/chain-options.png', profile: 'preview' });
export default sources;
