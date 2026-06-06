import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as opentype from 'opentype.js';
import sharp from 'sharp';
import type { StyleConfig } from './_types';

const REFERENCE_DIR = path.join(os.tmpdir(), 'flawless-style-text-references');
const DESCRIPTOR_EXTENSION = '.style-text-reference.json';
const RENDER_VERSION = 'browser-canvas-v1';
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 520;
const OPENTYPE_BROWSER_SCRIPT = path.join(process.cwd(), 'node_modules', 'opentype.js', 'dist', 'opentype.min.js');
const DEFAULT_RENDER_OPTIONS = {
  backgroundColor: '#ffffff',
  fillColor: '#050505',
  outlineColor: '#b8924a',
  outlineWidth: 34
};

type TextReferenceDescriptor = {
  kind: 'style-text-reference';
  styleId: string;
  family: string;
  fontPath: string;
  text: string;
};

type TextReferenceRenderer = 'playwright' | 'svg-path';

export type TextReferenceRenderOptions = {
  backgroundColor?: string;
  fillColor?: string;
  outlineColor?: string;
  outlineWidth?: number;
};

let playwrightBrowserPromise: Promise<any> | null = null;
let opentypeBrowserScriptPromise: Promise<string> | null = null;
const inFlightRenders = new Map<string, Promise<string>>();

function ensureReferenceDir() {
  fs.mkdirSync(REFERENCE_DIR, { recursive: true });
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function browserEscape(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
    .replace(/<\/script/gi, '<\\/script');
}

function normalizeColor(value: string | undefined, fallback: string) {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function normalizeRenderOptions(options?: TextReferenceRenderOptions) {
  const outlineWidth = Number.isFinite(options?.outlineWidth)
    ? Math.max(0, Math.min(96, Math.round(options!.outlineWidth!)))
    : DEFAULT_RENDER_OPTIONS.outlineWidth;

  return {
    backgroundColor: normalizeColor(options?.backgroundColor, DEFAULT_RENDER_OPTIONS.backgroundColor),
    fillColor: normalizeColor(options?.fillColor, DEFAULT_RENDER_OPTIONS.fillColor),
    outlineColor: normalizeColor(options?.outlineColor, DEFAULT_RENDER_OPTIONS.outlineColor),
    outlineWidth
  };
}

function activeRenderer(): TextReferenceRenderer {
  if (process.env.TEXT_REFERENCE_RENDERER === 'svg-path') return 'svg-path';
  return 'playwright';
}

function hashDescriptor(input: Omit<TextReferenceDescriptor, 'kind'>, options?: TextReferenceRenderOptions) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({
      ...input,
      renderOptions: normalizeRenderOptions(options),
      renderer: activeRenderer(),
      renderVersion: RENDER_VERSION
    }))
    .digest('hex')
    .slice(0, 24);
}

async function getOpentypeBrowserScript() {
  opentypeBrowserScriptPromise ??= fsp.readFile(OPENTYPE_BROWSER_SCRIPT, 'utf8');
  return opentypeBrowserScriptPromise;
}

async function getPlaywrightBrowser() {
  playwrightBrowserPromise ??= import('playwright').then(({ chromium }) => (
    chromium.launch({ headless: true })
  ));
  return playwrightBrowserPromise;
}

export function prewarmTextReferenceRenderer() {
  if (activeRenderer() !== 'playwright') return Promise.resolve();
  return Promise.all([
    getOpentypeBrowserScript(),
    getPlaywrightBrowser()
  ]).then(() => undefined);
}

export function isTextReferenceDescriptorPath(filePath: string) {
  return filePath.endsWith(DESCRIPTOR_EXTENSION);
}

export function createTextReferenceDescriptorPath(style: StyleConfig, text: string) {
  if (!style.fontReference) return null;

  const renderedText = style.fontReference.transform === 'uppercase'
    ? text.toUpperCase()
    : text;
  const descriptor: TextReferenceDescriptor = {
    kind: 'style-text-reference',
    styleId: style.id,
    family: style.fontReference.family,
    fontPath: path.join(process.cwd(), style.fontReference.file),
    text: renderedText
  };
  const hash = hashDescriptor(descriptor);

  ensureReferenceDir();
  const descriptorPath = path.join(REFERENCE_DIR, `${style.id}-${hash}${DESCRIPTOR_EXTENSION}`);
  if (!fs.existsSync(descriptorPath)) {
    fs.writeFileSync(descriptorPath, JSON.stringify(descriptor), 'utf8');
  }

  return descriptorPath;
}

function buildSvgPathReference(descriptor: TextReferenceDescriptor, options?: TextReferenceRenderOptions) {
  const renderOptions = normalizeRenderOptions(options);
  const width = CANVAS_WIDTH;
  const height = CANVAS_HEIGHT;
  const padding = 72;
  const fontBuffer = fs.readFileSync(descriptor.fontPath);
  const fontBytes = fontBuffer.buffer.slice(
    fontBuffer.byteOffset,
    fontBuffer.byteOffset + fontBuffer.byteLength
  );
  const font = opentype.parse(fontBytes);
  const text = descriptor.text.trim() || 'Name';
  const fontSize = 260;
  const baseline = 330;
  const glyphPath = font.getPath(text, 0, baseline, fontSize);
  const box = glyphPath.getBoundingBox();
  const textWidth = Math.max(1, box.x2 - box.x1);
  const textHeight = Math.max(1, box.y2 - box.y1);
  const scale = Math.min(
    (width - padding * 2) / textWidth,
    (height - padding * 2) / textHeight,
    1
  );
  const x = (width - textWidth * scale) / 2 - box.x1 * scale;
  const y = (height - textHeight * scale) / 2 - box.y1 * scale;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${renderOptions.backgroundColor}"/>
  <text x="36" y="50" fill="#555555" font-family="Arial, Helvetica, sans-serif" font-size="22" letter-spacing="3">TYPOGRAPHY REFERENCE ONLY</text>
  <text x="36" y="82" fill="#777777" font-family="Arial, Helvetica, sans-serif" font-size="18">Style: ${escapeXml(descriptor.family)}. Use letter shapes, outline envelope, spacing, and silhouette; ignore flat color/background.</text>
  <g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(5)})">
    ${renderOptions.outlineWidth > 0 ? `<path d="${glyphPath.toPathData(2)}" fill="none" stroke="${renderOptions.outlineColor}" stroke-width="${renderOptions.outlineWidth}" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
    <path d="${glyphPath.toPathData(2)}" fill="${renderOptions.fillColor}"/>
  </g>
</svg>`;
}

async function renderWithSvgPath(
  descriptor: TextReferenceDescriptor,
  outputPath: string,
  options?: TextReferenceRenderOptions
) {
  const svg = buildSvgPathReference(descriptor, options);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  await fsp.writeFile(outputPath, png);
}

async function renderWithPlaywright(
  descriptor: TextReferenceDescriptor,
  outputPath: string,
  options?: TextReferenceRenderOptions
) {
  const renderOptions = normalizeRenderOptions(options);
  const [browser, opentypeScript] = await Promise.all([
    getPlaywrightBrowser(),
    getOpentypeBrowserScript()
  ]);
  const page = await browser.newPage({
    viewport: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT
    }
  });

  try {
    const fontData = (await fsp.readFile(descriptor.fontPath)).toString('base64');
    await page.setContent(`<!doctype html>
<meta charset="utf-8" />
<canvas id="reference" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}"></canvas>
<script>${opentypeScript}</script>
<script>
  function fontFromBase64(data) {
    const bin = atob(data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return opentype.parse(bytes.buffer);
  }

  window.renderTextReference = function renderTextReference() {
    const canvas = document.getElementById('reference');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const text = \`${browserEscape(descriptor.text.trim() || 'Name')}\`;
    const family = \`${browserEscape(descriptor.family)}\`;
    const font = fontFromBase64(\`${fontData}\`);
    const outlineWidth = ${renderOptions.outlineWidth};
    const topLabelHeight = 92;
    const padding = 72 + outlineWidth;
    const fontSize = 260;
    const baseline = 330;
    const glyphPath = font.getPath(text, 0, baseline, fontSize, {
      kerning: true,
      features: {
        calt: true,
        liga: true,
        rlig: true
      }
    });
    const box = glyphPath.getBoundingBox();
    const textWidth = Math.max(1, box.x2 - box.x1);
    const textHeight = Math.max(1, box.y2 - box.y1);
    const scale = Math.min(
      (width - padding * 2) / textWidth,
      (height - topLabelHeight - padding * 2) / textHeight,
      1
    );
    const x = (width - textWidth * scale) / 2 - box.x1 * scale;
    const y = topLabelHeight + (height - topLabelHeight - textHeight * scale) / 2 - box.y1 * scale;

    ctx.fillStyle = '${renderOptions.backgroundColor}';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#555555';
    ctx.font = '22px Arial, Helvetica, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('TYPOGRAPHY REFERENCE ONLY', 36, 50);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = '#777777';
    ctx.font = '18px Arial, Helvetica, sans-serif';
    ctx.fillText('Style: ' + family + '. Use letter shapes, outline envelope, spacing, and silhouette; ignore flat color/background.', 36, 82);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (outlineWidth > 0) {
      ctx.lineWidth = outlineWidth;
      ctx.strokeStyle = '${renderOptions.outlineColor}';
      glyphPath.draw(ctx);
      ctx.stroke();
    }
    ctx.fillStyle = '${renderOptions.fillColor}';
    glyphPath.draw(ctx);
    ctx.fill();
    ctx.restore();

    return canvas.toDataURL('image/png');
  };
</script>`);
    const dataUrl = await page.evaluate(() => (window as any).renderTextReference());
    const png = Buffer.from(dataUrl.split(',')[1] ?? '', 'base64');
    await fsp.writeFile(outputPath, png);
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function renderTextReferenceToFile(descriptor: TextReferenceDescriptor, options?: TextReferenceRenderOptions) {
  const hash = hashDescriptor({
    styleId: descriptor.styleId,
    family: descriptor.family,
    fontPath: descriptor.fontPath,
    text: descriptor.text
  }, options);
  ensureReferenceDir();
  const outputPath = path.join(REFERENCE_DIR, `${descriptor.styleId}-${hash}.png`);
  if (fs.existsSync(outputPath)) return outputPath;

  const inFlight = inFlightRenders.get(outputPath);
  if (inFlight) return inFlight;

  const render = (async () => {
    if (activeRenderer() === 'playwright') {
      try {
        await renderWithPlaywright(descriptor, outputPath, options);
        return outputPath;
      } catch (error) {
        console.warn(`Playwright text reference render failed for ${descriptor.styleId}; falling back to SVG path renderer.`, error);
      }
    }

    await renderWithSvgPath(descriptor, outputPath, options);
    return outputPath;
  })();

  inFlightRenders.set(outputPath, render);
  try {
    return await render;
  } finally {
    inFlightRenders.delete(outputPath);
  }
}

export async function renderTextReferenceDescriptor(
  descriptorPath: string,
  options?: TextReferenceRenderOptions
) {
  const raw = await fsp.readFile(descriptorPath, 'utf8');
  const descriptor = JSON.parse(raw) as TextReferenceDescriptor;
  if (descriptor.kind !== 'style-text-reference') {
    throw new Error(`Unsupported text reference descriptor: ${descriptorPath}`);
  }

  return renderTextReferenceToFile(descriptor, options);
}

export async function renderTextReferencePreview(input: {
  styleId: string;
  family: string;
  fontPath: string;
  text: string;
  transform?: 'uppercase' | 'none';
  options?: TextReferenceRenderOptions;
}) {
  const renderedText = input.transform === 'uppercase'
    ? input.text.toUpperCase()
    : input.text;
  const descriptor: TextReferenceDescriptor = {
    kind: 'style-text-reference',
    styleId: input.styleId,
    family: input.family,
    fontPath: input.fontPath,
    text: renderedText.trim() || 'Name'
  };

  return renderTextReferenceToFile(descriptor, input.options);
}
