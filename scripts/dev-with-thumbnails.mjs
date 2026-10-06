import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url), root = process.cwd();
const tsx = path.join(path.dirname(require.resolve('tsx/package.json')), 'dist/cli.mjs'), nextBin = require.resolve('next/dist/bin/next');
let next, converter, stopping = false, timer, queued = false, running = false;
const watchers = new Map();
function dependencies(file, seen = new Set()) {
  if (seen.has(file) || file.includes('node_modules') || !fs.existsSync(file)) return seen;
  seen.add(file);
  if (!/\.[cm]?tsx?$/.test(file)) return seen;
  const imports = ts.preProcessFile(fs.readFileSync(file, 'utf8')).importedFiles;
  for (const imp of imports) {
    if (!imp.fileName.startsWith('.')) continue;
    const found = ts.resolveModuleName(imp.fileName, file, { moduleResolution: ts.ModuleResolutionKind.Bundler, resolveJsonModule: true }, ts.sys).resolvedModule?.resolvedFileName;
    if (found) dependencies(path.resolve(found), seen);
    else {
      // Watch prospective local imports too, so creating a missing config can recover.
      const base = path.resolve(path.dirname(file), imp.fileName);
      for (const candidate of path.extname(base) ? [base] : [base + '.ts', base + '.tsx', base + '.json', path.join(base, 'index.ts')]) seen.add(candidate);
    }
  }
  return seen;
}
function refreshWatchers() {
  const files = dependencies(path.join(root, 'scripts/thumbnails/catalog.ts'));
  dependencies(path.join(root, 'scripts/generate-thumbnails.ts'), files);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/lib/thumbnails/manifest.generated.json'), 'utf8'));
  for (const entry of Object.values(manifest.entries)) files.add(path.join(root, 'public', entry.source));
  for (const src of JSON.parse(fs.readFileSync(path.join(root, '.thumbnail-cache/inputs.json'), 'utf8'))) files.add(path.join(root, 'public', src));
  const directories = new Map();
  for (const file of files) {
    let dir = path.dirname(file), name = path.basename(file);
    while (!fs.existsSync(dir)) { name = path.basename(dir); dir = path.dirname(dir); }
    if (!directories.has(dir)) directories.set(dir, new Set()); directories.get(dir).add(name);
  }
  for (const watcher of watchers.values()) watcher.close(); watchers.clear();
  for (const [dir, names] of directories) watchers.set(dir, fs.watch(dir, (_, name) => {
    if (!name || names.has(name.toString())) { clearTimeout(timer); timer = setTimeout(() => regenerate(false), 150); }
  }));
}
function pass() {
  return new Promise(resolve => {
    converter = spawn(process.execPath, [tsx, 'scripts/generate-thumbnails.ts'], { cwd: root, stdio: 'inherit' });
    converter.on('exit', code => { converter = undefined; resolve(code === 0); });
    converter.on('error', error => { console.error(error.message); resolve(false); });
  });
}
async function regenerate(initial) {
  if (stopping) return;
  if (running) { queued = true; return; }
  running = true;
  const ok = await pass(); running = false;
  if (stopping) return;
  if (initial && !ok) return shutdown(1);
  refreshWatchers();
  if (!ok) console.error('Thumbnail refresh failed. Fix the source/configuration; the previous manifest is retained.');
  if (initial) {
    next = spawn(process.execPath, [nextBin, 'dev', ...process.argv.slice(2)], { cwd: root, stdio: 'inherit' });
    next.on('exit', code => shutdown(code ?? 1)); next.on('error', () => shutdown(1));
  }
  if (queued) { queued = false; regenerate(false); }
}
function shutdown(code = 0) {
  if (stopping) return; stopping = true; clearTimeout(timer);
  for (const watcher of watchers.values()) watcher.close();
  next?.kill('SIGTERM'); converter?.kill('SIGTERM');
  const deadline = setTimeout(() => { next?.kill('SIGKILL'); converter?.kill('SIGKILL'); process.exit(code); }, 3000);
  deadline.unref(); process.exitCode = code;
}
process.on('SIGINT', () => shutdown()); process.on('SIGTERM', () => shutdown());
regenerate(true).catch(error => { console.error(error.message); shutdown(1); });
