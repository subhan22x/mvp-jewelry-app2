import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

export const profiles = { icon: [80, 160, 320], picker: [160, 320, 640], preview: [160, 320, 640, 960] };
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const settings = { version: 1, encoder: sharp.versions, alphaQuality: 100, effort: 5, pixelLimit: 50_000_000 };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function atomicWrite(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try { await fs.writeFile(temp, data); await fs.rename(temp, file); }
  finally { await fs.rm(temp, { force: true }); }
}
async function lock(root, timeout) {
  const file = path.join(root, '.thumbnail-cache/writer.lock');
  await fs.mkdir(path.dirname(file), { recursive: true });
  const token = crypto.randomUUID(), started = Date.now();
  while (true) {
    try {
      const handle = await fs.open(file, 'wx');
      await handle.writeFile(JSON.stringify({ pid: process.pid, token })); await handle.close();
      return async () => { const holder = JSON.parse(await fs.readFile(file, 'utf8')); if (holder.token === token) await fs.rm(file, { force: true }); };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      // Serialize stale-lock recovery so two waiters cannot remove a successor's lock.
      const recoveryFile = file + '.recovery';
      let recovery;
      try {
        recovery = await fs.open(recoveryFile, 'wx');
        await recovery.writeFile(JSON.stringify({ pid: process.pid }));
        let stale = false;
        try {
          const holder = JSON.parse(await fs.readFile(file, 'utf8'));
          if (!Number.isInteger(holder.pid) || holder.pid <= 0) throw new Error('Invalid lock metadata');
          try { process.kill(holder.pid, 0); }
          catch (e) { if (e.code === 'ESRCH') stale = true; }
        } catch (error) {
          if (error.code === 'ENOENT') stale = false;
          else {
            const stat = await fs.stat(file).catch(() => null);
            stale = Boolean(stat && Date.now() - stat.mtimeMs > 10_000);
          }
        }
        if (stale) await fs.rm(file, { force: true });
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        // A killed recovery process must not permanently block future passes.
        const before = await fs.stat(recoveryFile).catch(() => null);
        if (before) {
          let dead = false;
          try {
            const holder = JSON.parse(await fs.readFile(recoveryFile, 'utf8'));
            if (!Number.isInteger(holder.pid) || holder.pid <= 0) throw new Error('Invalid recovery metadata');
            try { process.kill(holder.pid, 0); } catch (e) { dead = e.code === 'ESRCH'; }
          } catch { dead = Date.now() - before.mtimeMs > 10_000; }
          const current = await fs.stat(recoveryFile).catch(() => null);
          if (dead && current?.ino === before.ino && current?.mtimeMs === before.mtimeMs) await fs.rm(recoveryFile, { force: true });
        }
      } finally {
        if (recovery) { await recovery.close(); await fs.rm(recoveryFile, { force: true }); }
      }
      if (Date.now() - started >= timeout) throw new Error('Thumbnail writer is busy; retry after the current pass finishes.');
      await delay(100);
    }
  }
}
export async function resolveSource(root, src) {
  if (!src.startsWith('/') || src.startsWith('//') || /[?#\\\0]/.test(src) || src.split('/').includes('..') || src.startsWith('/thumbnails/')) throw new Error(`Invalid thumbnail source: ${src}`);
  const publicRoot = await fs.realpath(path.join(root, 'public'));
  const file = await fs.realpath(path.join(publicRoot, src.slice(1)));
  if (!file.startsWith(publicRoot + path.sep)) throw new Error(`Thumbnail source escapes public/: ${src}`);
  return file;
}
async function cachedEntry(root, key) {
  try {
    const entry = JSON.parse(await fs.readFile(path.join(root, '.thumbnail-cache', key + '.json'), 'utf8'));
    const outputs = entry.kind === 'vector' ? [entry] : entry.variants;
    for (const output of outputs) {
      if (!/^\/thumbnails\/[a-f0-9]{64}(?:-\d+\.webp|\.svg)$/.test(output.url)) return null;
      const data = await fs.readFile(path.join(root, 'public', output.url));
      if (hash(data) !== output.hash) return null;
    }
    return entry;
  } catch { return null; }
}
async function vector(root, data, src) {
  const text = data.toString('utf8');
  if (/<script\b|<foreignObject\b|\son\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|\/\/|data:)|<!ENTITY/i.test(text)) throw new Error(`Unsafe SVG thumbnail: ${src}`);
  const view = text.match(/viewBox\s*=\s*["']\s*[-.\d]+[ ,]+[-.\d]+[ ,]+([.\d]+)[ ,]+([.\d]+)/i);
  const width = Number(text.match(/\bwidth\s*=\s*["']([.\d]+)(?:px)?["']/)?.[1] || view?.[1]);
  const height = Number(text.match(/\bheight\s*=\s*["']([.\d]+)(?:px)?["']/)?.[1] || view?.[2]);
  if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) throw new Error(`SVG requires dimensions or viewBox: ${src}`);
  const contentHash = hash(data), url = `/thumbnails/${contentHash}.svg`;
  await atomicWrite(path.join(root, 'public', url), data);
  return { kind: 'vector', width, height, url, bytes: data.length, hash: contentHash };
}
async function convert(root, data, source, widths) {
  if (source.src.toLowerCase().endsWith('.svg')) return vector(root, data, source.src);
  const image = sharp(data, { limitInputPixels: settings.pixelLimit });
  const metadata = await image.metadata();
  if ((metadata.pages || 1) > 1) throw new Error(`Animated thumbnails are unsupported: ${source.src}`);
  if (!['png', 'jpeg', 'webp', 'avif', 'heif'].includes(metadata.format)) throw new Error(`Unsupported thumbnail format: ${source.src}`);
  const rotated = metadata.orientation && metadata.orientation >= 5;
  const width = rotated ? metadata.height : metadata.width, height = rotated ? metadata.width : metadata.height;
  const variants = [];
  for (const requested of [...new Set(widths.map(w => Math.min(w, width)))].sort((a,b) => a-b)) {
    const { data: output, info } = await sharp(data, { limitInputPixels: settings.pixelLimit }).rotate().toColourspace('srgb').resize({ width: requested, withoutEnlargement: true }).webp({ quality: source.quality ?? 85, alphaQuality: settings.alphaQuality, effort: settings.effort }).toBuffer({ resolveWithObject: true });
    const contentHash = hash(output), url = `/thumbnails/${contentHash}-${info.width}.webp`;
    await atomicWrite(path.join(root, 'public', url), output);
    variants.push({ width: info.width, height: info.height, url, bytes: output.length, hash: contentHash });
  }
  return { kind: 'raster', width, height, variants };
}
export async function generate(root, sources, { check = false, lockTimeout = 180_000 } = {}) {
  const ids = new Set(), groups = new Map();
  for (const source of sources) {
    if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(source.id) || ids.has(source.id)) throw new Error(`Invalid or duplicate thumbnail ID: ${source.id}`);
    if (!profiles[source.profile]) throw new Error(`Unknown thumbnail profile: ${source.profile}`);
    if (source.quality != null && (!Number.isInteger(source.quality) || source.quality < 1 || source.quality > 100)) throw new Error(`Invalid quality: ${source.id}`);
    ids.add(source.id);
    const file = await resolveSource(root, source.src);
    const groupKey = file + ':' + (source.quality ?? 85);
    const group = groups.get(groupKey) || { file, source, entries: [], widths: new Set() };
    group.entries.push(source); profiles[source.profile].forEach(w => group.widths.add(w)); groups.set(groupKey, group);
  }
  const release = await lock(root, lockTimeout);
  try {
    const entries = {}, sourceKeys = {}, jobs = [...groups.values()], pending = new Map(); let cursor = 0, reused = 0, converted = 0;
    // Two bounded workers. Wait for both to settle before releasing the lock on errors.
    const workers = await Promise.allSettled(Array.from({ length: 2 }, async () => {
      while (cursor < jobs.length) {
        const group = jobs[cursor++], data = await fs.readFile(group.file);
        const widths = [...group.widths].sort((a,b) => a-b);
        const key = hash(Buffer.concat([data, Buffer.from(JSON.stringify({ ...settings, quality: group.source.quality ?? 85, widths }))]));
        let task = pending.get(key);
        if (task) reused++;
        else {
          task = (async () => {
            const cached = await cachedEntry(root, key);
            if (cached) { reused++; return cached; }
            const output = await convert(root, data, group.source, widths);
            converted++;
            await atomicWrite(path.join(root, '.thumbnail-cache', key + '.json'), JSON.stringify(output));
            return output;
          })();
          pending.set(key, task);
        }
        const entry = await task;
        for (const source of group.entries) { entries[source.id] = { ...entry, source: source.src }; sourceKeys[source.id] = key; }
      }
    }));
    const failure = workers.find(w => w.status === 'rejected'); if (failure) throw failure.reason;
    const manifest = { version: 1, entries: Object.fromEntries(Object.entries(entries).sort()), sourceKeys: Object.fromEntries(Object.entries(sourceKeys).sort()) };
    const file = path.join(root, 'src/lib/thumbnails/manifest.generated.json');
    const contents = JSON.stringify(manifest, null, 2) + '\n';
    const previous = await fs.readFile(file, 'utf8').catch(() => '');
    if (check && previous !== contents) throw new Error('Thumbnail manifest is stale. Run npm run thumbnails and commit the updated manifest.');
    if (!check && previous !== contents) await atomicWrite(file, contents);
    return { registered: ids.size, converted, reused, manifest };
  } finally { await release(); }
}
