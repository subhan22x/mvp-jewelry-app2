import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import opentype from 'opentype.js';
import sharp from 'sharp';
import type { StyleConfig } from './_types';

const REFERENCE_DIR = path.join(os.tmpdir(), 'flawless-style-text-references');
const DESCRIPTOR_EXTENSION = '.style-text-reference.json';

type TextReferenceDescriptor = {
  kind: 'style-text-reference';
  styleId: string;
  family: string;
  fontPath: string;
  text: string;
};

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

function hashDescriptor(input: Omit<TextReferenceDescriptor, 'kind'>) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex')
    .slice(0, 24);
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

function buildSvgPathReference(descriptor: TextReferenceDescriptor) {
  const width = 1200;
  const height = 520;
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
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="36" y="50" fill="#555555" font-family="Arial, Helvetica, sans-serif" font-size="22" letter-spacing="3">TYPOGRAPHY REFERENCE ONLY</text>
  <text x="36" y="82" fill="#777777" font-family="Arial, Helvetica, sans-serif" font-size="18">Style: ${escapeXml(descriptor.family)}. Use letter shapes and silhouette, not flat color or background.</text>
  <g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(5)})">
    <path d="${glyphPath.toPathData(2)}" fill="#050505"/>
  </g>
</svg>`;
}

export async function renderTextReferenceDescriptor(descriptorPath: string) {
  const raw = await fsp.readFile(descriptorPath, 'utf8');
  const descriptor = JSON.parse(raw) as TextReferenceDescriptor;
  if (descriptor.kind !== 'style-text-reference') {
    throw new Error(`Unsupported text reference descriptor: ${descriptorPath}`);
  }

  const hash = hashDescriptor({
    styleId: descriptor.styleId,
    family: descriptor.family,
    fontPath: descriptor.fontPath,
    text: descriptor.text
  });
  ensureReferenceDir();
  const outputPath = path.join(REFERENCE_DIR, `${descriptor.styleId}-${hash}.png`);
  if (fs.existsSync(outputPath)) return outputPath;

  const svg = buildSvgPathReference(descriptor);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  await fsp.writeFile(outputPath, png);
  return outputPath;
}
