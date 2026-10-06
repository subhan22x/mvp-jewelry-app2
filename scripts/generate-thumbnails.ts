import fs from 'node:fs/promises';
import { generate, atomicWrite } from './thumbnails/engine.mjs';
import sources from './thumbnails/catalog';
fs.mkdir('.thumbnail-cache', { recursive: true }).then(() => atomicWrite('.thumbnail-cache/inputs.json', JSON.stringify(sources.map(s => s.src)))).then(() => generate(process.cwd(), sources, { check: process.argv.includes('--check') }))
  .then(result => console.log(`Thumbnails: ${result.registered} registered, ${result.converted} converted, ${result.reused} reused.`))
  .catch(error => { console.error(error.message); process.exitCode = 1; });
