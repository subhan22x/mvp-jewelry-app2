import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { getStyle, getTemplatePath } from './registry';
import { renderTemplate } from './utils';
import type { BuiltVariant, CustomerInput } from './_types';

const InputSchema = z.object({
  userId: z.string().min(1),
  styleId: z.string().min(1),
  text: z.string().min(1),
  twoTone: z.boolean(),
  primaryMetal: z.enum(['rose_gold','white_gold','yellow_gold']),
  secondaryMetal: z.enum(['rose_gold','white_gold','yellow_gold']).nullish(),
  emblem: z.enum(['none','crown','heart','spade','butterfly','moneybag']),
});

function splitLines(raw: string): string[] {
  const lines = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  return lines.length ? lines : [raw.trim()];
}

export function buildVariants(input: CustomerInput): BuiltVariant[] {
  const data = InputSchema.parse(input);
  const style = getStyle(data.styleId);
  const templatePath = getTemplatePath(style.id, style.templateKey);
  const raw = fs.readFileSync(templatePath, 'utf8');

  const lines = splitLines(data.text);
  const baseFont = style.defaults.font ?? 'inherit_source_style';

  const variants: BuiltVariant[] = [1,2,3,4].map((n) => {
    const v = style.variantMatrix[n-1];
    const merged = {
      deviation: v.deviationStrength ?? style.defaults.deviationStrength,
      bubble:    v.bubbleOutline ?? style.defaults.bubbleOutline,
      caps:      v.forceAllCaps ?? style.defaults.forceAllCaps,
      view:      style.defaults.view
    };

    const finalLines = merged.caps ? lines.map(line => line.toUpperCase()) : lines;
    const schemeType = data.twoTone ? 'two_tone' : 'single_tone';
    const secondary = data.twoTone ? (data.secondaryMetal ?? data.primaryMetal) : data.primaryMetal;
    const capsPolicy = merged.caps ? 'forced_all_caps' : 'as_typed';
    const colorScheme = schemeType === 'two_tone'
      ? `${schemeType} ${data.primaryMetal} + ${secondary}`
      : `${schemeType} ${data.primaryMetal}`;

    const prompt = renderTemplate(raw, {
      TEXT: finalLines.join(' '),
      LINES_ARRAY: JSON.stringify(finalLines),
      DEVIATION: merged.deviation,
      PENDANT_REF: style.assets?.pendantRef ? path.basename(style.assets.pendantRef) : 'attached pendant reference',
      BAIL_REF: style.assets?.bailRef ? path.basename(style.assets.bailRef) : 'use pendant reference for bail style',
      FONT: baseFont,
      EMBLEM: data.emblem,
      SCHEME_TYPE: schemeType,
      PRIMARY_METAL: data.primaryMetal,
      SECONDARY_METAL: secondary,
      COLOR_SCHEME: colorScheme,
      CAPS_POLICY: capsPolicy,
      BUBBLE_OUTLINE: merged.bubble,
      BUBBLE_OUTLINE_ENABLED: merged.bubble,
      VIEW: merged.view
    });

    const attachments: string[] = [];
    if (style.assets?.pendantRef) {
      attachments.push(path.join(process.cwd(), style.assets.pendantRef));
    }
    if (style.assets?.bailRef) {
      attachments.push(path.join(process.cwd(), style.assets.bailRef));
    }
    if (data.emblem !== 'none') {
      const emblemRef = style.assets?.emblemRefs?.[data.emblem];
      if (emblemRef) attachments.push(path.join(process.cwd(), emblemRef));
    }

    const uniqueAttachments = Array.from(new Set(attachments));
    return { variant: n as 1|2|3|4, prompt, attachments: uniqueAttachments };
  });

  return variants;
}
