// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { generate, resolveSource } from '../engine.mjs';
let root: string;
beforeEach(async () => { root = await fs.mkdtemp(path.join(os.tmpdir(), 'thumbnail-test-')); await fs.mkdir(path.join(root, 'public')); });
afterEach(async () => fs.rm(root, { recursive: true, force: true }));
const source = { id: 'test.art', src: '/art.png', profile: 'preview' };
async function image(color = '#ff000080') { await sharp({ create: { width: 128, height: 64, channels: 4, background: color } }).png().toFile(path.join(root, 'public/art.png')); }
const manifestPath = () => path.join(root, 'src/lib/thumbnails/manifest.generated.json');
describe('thumbnail generator', () => {
  it('preserves alpha, caps sizes, records actual dimensions and reuses verified outputs', async () => {
    await image(); const first = await generate(root, [source]);
    const art = first.manifest.entries['test.art'];
    expect(art.variants.map((v: { width: number }) => v.width)).toEqual([128]); expect(art.variants[0].height).toBe(64);
    expect((await sharp(path.join(root, 'public', art.variants[0].url)).metadata()).hasAlpha).toBe(true);
    expect((await generate(root, [source])).reused).toBe(1);
    await fs.writeFile(path.join(root, 'public', art.variants[0].url), 'corrupted');
    expect((await generate(root, [source])).converted).toBe(1);
  });
  it('invalidates source and quality changes while retaining old URLs', async () => {
    await image(); const first = await generate(root, [source]); const old = first.manifest.entries['test.art'].variants[0].url;
    await image('#00ff0080'); const second = await generate(root, [source]);
    expect(second.manifest.entries['test.art'].variants[0].url).not.toBe(old);
    expect(await fs.stat(path.join(root, 'public', old))).toBeTruthy();
    const quality = await generate(root, [{ ...source, quality: 60 }]);
    expect(quality.manifest.sourceKeys['test.art']).not.toBe(second.manifest.sourceKeys['test.art']);
  });
  it('deduplicates shared sources without collapsing distinct IDs', async () => {
    await image(); const result = await generate(root, [source, { ...source, id: 'test.other', profile: 'icon' }]);
    expect(result.converted).toBe(1); expect(result.registered).toBe(2);
    expect(result.manifest.entries['test.art']).toEqual(result.manifest.entries['test.other']);
  });
  it('shares conversions for identical bytes under different original filenames', async () => {
    await image(); await fs.copyFile(path.join(root, 'public/art.png'), path.join(root, 'public/copy.png'));
    const result = await generate(root, [source, { ...source, id: 'test.copy', src: '/copy.png' }]);
    expect(result.converted).toBe(1);
    expect(result.manifest.entries['test.art'].variants).toEqual(result.manifest.entries['test.copy'].variants);
    expect(result.manifest.entries['test.copy'].source).toBe('/copy.png');
  });
  it('rejects duplicate IDs, unknown profiles, traversal and symlink escape', async () => {
    await image(); await expect(generate(root, [source, source])).rejects.toThrow('duplicate');
    await expect(generate(root, [{ ...source, profile: 'bogus' }])).rejects.toThrow('profile');
    await expect(resolveSource(root, '/../secret')).rejects.toThrow('Invalid');
    await fs.symlink(path.join(root, 'secret'), path.join(root, 'public/escape')); await fs.writeFile(path.join(root, 'secret'), 'not public');
    await expect(resolveSource(root, '/escape')).rejects.toThrow('escapes');
  });
  it('keeps the published manifest intact when a conversion fails', async () => {
    await image(); await generate(root, [source]); const previous = await fs.readFile(manifestPath(), 'utf8');
    await fs.writeFile(path.join(root, 'public/art.png'), 'invalid image');
    await expect(generate(root, [source])).rejects.toThrow();
    expect(await fs.readFile(manifestPath(), 'utf8')).toBe(previous);
    await expect(fs.stat(path.join(root, '.thumbnail-cache/writer.lock'))).rejects.toThrow();
  });
  it('serializes concurrent passes and times out on a live holder', async () => {
    await image(); const passes = await Promise.all([generate(root, [source]), generate(root, [source])]);
    expect(passes.reduce((n,p) => n+p.converted, 0)).toBe(1);
    await fs.writeFile(path.join(root, '.thumbnail-cache/writer.lock'), JSON.stringify({ pid: process.pid, token: 'live' }));
    await expect(generate(root, [source], { lockTimeout: 100 })).rejects.toThrow('busy');
  });
  it('recovers a crashed writer and interrupted recovery guard', async () => {
    await image(); await fs.mkdir(path.join(root, '.thumbnail-cache'));
    const deadPid = 2147483647;
    await fs.writeFile(path.join(root, '.thumbnail-cache/writer.lock'), JSON.stringify({ pid: deadPid, token: 'dead' }));
    await fs.writeFile(path.join(root, '.thumbnail-cache/writer.lock.recovery'), JSON.stringify({ pid: deadPid }));
    expect((await generate(root, [source], { lockTimeout: 2000 })).converted).toBe(1);
  });
  it('reports manifest drift without publishing it', async () => {
    await image(); await generate(root, [source]); const previous = await fs.readFile(manifestPath(), 'utf8');
    await image('#0000ffff'); await expect(generate(root, [source], { check: true })).rejects.toThrow('stale');
    expect(await fs.readFile(manifestPath(), 'utf8')).toBe(previous);
  });
  it('passes vectors through as hashed files without raster variants', async () => {
    await fs.writeFile(path.join(root, 'public/art.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 16"><path d="M0 0h32v16H0z"/></svg>');
    const result = await generate(root, [{ ...source, src: '/art.svg' }]);
    expect(result.manifest.entries['test.art']).toMatchObject({ kind: 'vector', width: 32, height: 16 });
    expect(result.manifest.entries['test.art']).not.toHaveProperty('variants');
    await fs.writeFile(path.join(root, 'public/art.svg'), '<svg viewBox="0 0 32 16"><script>alert(1)</script></svg>');
    await expect(generate(root, [{ ...source, src: '/art.svg' }])).rejects.toThrow('Unsafe');
  });
  it('records dimensions after orientation normalization', async () => {
    await sharp({ create: { width: 80, height: 40, channels: 3, background: '#123456' } }).jpeg().withMetadata({ orientation: 6 }).toFile(path.join(root, 'public/rotated.jpg'));
    const result = await generate(root, [{ ...source, src: '/rotated.jpg' }]);
    expect(result.manifest.entries['test.art']).toMatchObject({ width: 40, height: 80 });
    expect(result.manifest.entries['test.art'].variants[0]).toMatchObject({ width: 40, height: 80 });
  });
});
