import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import YAML from 'yaml';
import type { StyleConfig } from './_types';

const STYLES_DIR = path.join(process.cwd(), 'src', 'lib', 'styles');

const cache = new Map<string, StyleConfig>();

function loadStyle(dir: string): StyleConfig {
  const yml = fs.readFileSync(path.join(dir, 'style.yml'), 'utf8');
  const cfg = YAML.parse(yml) as StyleConfig;
  return cfg;
}

export function getStyle(styleId: string): StyleConfig {
  if (cache.has(styleId)) return cache.get(styleId)!;
  const matches = fg.sync(`**/${styleId}/style.yml`, { cwd: STYLES_DIR, onlyFiles: true, absolute: true });
  if (!matches.length) throw new Error(`Style not found: ${styleId}`);
  const dir = path.dirname(matches[0]);
  const cfg = loadStyle(dir);
  cache.set(styleId, cfg);
  return cfg;
}

export function getAllStyles(): StyleConfig[] {
  const matches = fg.sync(`**/style.yml`, { cwd: STYLES_DIR, onlyFiles: true, absolute: true });
  return matches
    .map(match => {
      const dir = path.dirname(match);
      const cfg = loadStyle(dir);
      cache.set(cfg.id, cfg);
      return cfg;
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getTemplatePath(styleId: string, templateKey: string): string {
  const matches = fg.sync(`**/${styleId}/${templateKey}.{jsonp,prompt}`, { cwd: STYLES_DIR, onlyFiles: true, absolute: true });
  if (!matches.length) throw new Error(`Template not found: ${styleId}/${templateKey}.jsonp or .prompt`);
  return matches[0];
}

export function getSnippetPath(styleId: string, snippetsKey: string): string {
  const matches = fg.sync(`**/${styleId}/${snippetsKey}.yml`, { cwd: STYLES_DIR, onlyFiles: true, absolute: true });
  if (!matches.length) throw new Error(`Snippet file not found: ${styleId}/${snippetsKey}.yml`);
  return matches[0];
}
