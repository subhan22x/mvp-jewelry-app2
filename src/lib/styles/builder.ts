import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import YAML from 'yaml';
import { getSnippetPath, getStyle, getTemplatePath } from './registry';
import { renderTemplate } from './utils';
import type { BuiltVariant, CustomerInput, Emblem, PlainChain, PlainColor, PlainKarat, PlainMetal } from './_types';
import type { PromptMode } from '../prompt-mode';

const InputSchema = z.object({
  userId: z.string().min(1),
  styleId: z.string().min(1),
  text: z.string().min(1),
  pendantFinish: z.enum(['icedout', 'plain']).default('icedout'),
  twoTone: z.boolean().optional(),
  primaryMetal: z.enum(['rose_gold','white_gold','yellow_gold']).optional(),
  secondaryMetal: z.enum(['rose_gold','white_gold','yellow_gold']).nullish(),
  emblem: z.enum(['none','crown','heart','spade','butterfly','moneybag']).optional(),
  plainColor: z.enum(['gold', 'silver', 'rose_gold']).optional(),
  plainMetal: z.enum(['gold_plated', 'silver', 'gold']).optional(),
  plainKarat: z.enum(['10k', '14k', '18k']).nullish(),
  plainChain: z.enum(['rope', 'box', 'snake', 'cable', 'station', 'bar_link_tube_station', 'figaro_oval_link']).optional()
}).superRefine((data, ctx) => {
  if (data.pendantFinish === 'plain') {
    if (!data.plainColor) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['plainColor'], message: 'plainColor is required for plain pendants.' });
    if (!data.plainMetal) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['plainMetal'], message: 'plainMetal is required for plain pendants.' });
    if (!data.plainChain) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['plainChain'], message: 'plainChain is required for plain pendants.' });
    if (data.plainMetal === 'gold' && !data.plainKarat) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['plainKarat'], message: 'plainKarat is required when plainMetal is gold.' });
    }
    return;
  }

  if (typeof data.twoTone !== 'boolean') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['twoTone'], message: 'twoTone is required for icedout pendants.' });
  if (!data.primaryMetal) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['primaryMetal'], message: 'primaryMetal is required for icedout pendants.' });
  if (!data.emblem) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['emblem'], message: 'emblem is required for icedout pendants.' });
});

function splitLines(raw: string): string[] {
  const lines = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  return lines.length ? lines : [raw.trim()];
}

const VERTICAL_9_16_INSTRUCTION = 'Render the final product photo in a vertical 9:16 composition. Keep the full pendant and bail visible with clean margins.';

type NaturalLanguageSnippets = {
  emblems: Record<Emblem, string>;
  colorSchemes: {
    single_tone: string;
    two_tone: string;
  };
};

function addVariantCompositionGuidance(prompt: string, variant: number) {
  if (variant !== 1) return prompt;

  try {
    const parsed = JSON.parse(prompt);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return JSON.stringify({
        ...parsed,
        composition_control: {
          aspect_ratio: '9:16',
          instruction: VERTICAL_9_16_INSTRUCTION
        }
      }, null, 2);
    }
  } catch {
    // Some style prompts are intentionally prose rather than JSON.
  }

  return `${prompt.trim()}\n\n${VERTICAL_9_16_INSTRUCTION}`;
}

function metalLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function plainColorLabel(value: PlainColor) {
  const labels: Record<PlainColor, string> = {
    gold: 'Yellow Gold',
    silver: 'Silver',
    rose_gold: 'Rose Gold'
  };
  return labels[value];
}

function plainMetalLabel(value: PlainMetal) {
  const labels: Record<PlainMetal, string> = {
    gold_plated: 'Gold Plated',
    silver: 'Silver',
    gold: 'Solid Gold'
  };
  return labels[value];
}

function plainKaratLabel(value: PlainKarat | null | undefined) {
  return value ? value.toUpperCase() : 'Not applicable';
}

function plainChainLabel(value: PlainChain) {
  const labels: Record<PlainChain, string> = {
    rope: 'Rope chain',
    box: 'Box chain',
    snake: 'Snake chain',
    cable: 'Cable chain',
    station: 'Station chain',
    bar_link_tube_station: 'Bar link chain / tube station chain',
    figaro_oval_link: 'Figaro style / oval link chain'
  };
  return labels[value];
}

function loadNaturalLanguageSnippets(styleId: string, snippetsKey: string) {
  const raw = fs.readFileSync(getSnippetPath(styleId, snippetsKey), 'utf8');
  return z.object({
    emblems: z.record(z.string()),
    colorSchemes: z.object({
      single_tone: z.string().min(1),
      two_tone: z.string().min(1)
    })
  }).parse(YAML.parse(raw)) as NaturalLanguageSnippets;
}

function buildNaturalLanguagePrompt({
  raw,
  snippets,
  text,
  emblem,
  twoTone,
  primaryMetal,
  secondaryMetal
}: {
  raw: string;
  snippets: NaturalLanguageSnippets;
  text: string;
  emblem: Emblem;
  twoTone: boolean;
  primaryMetal: string;
  secondaryMetal: string;
}) {
  const schemeKey = twoTone ? 'two_tone' : 'single_tone';
  const colorSnippet = renderTemplate(snippets.colorSchemes[schemeKey], {
    PRIMARY_METAL_LABEL: metalLabel(primaryMetal),
    SECONDARY_METAL_LABEL: metalLabel(secondaryMetal)
  });

  return renderTemplate(raw, {
    TEXT_SNIPPET: text,
    EMBLEM_SNIPPET: snippets.emblems[emblem] ?? snippets.emblems.none,
    COLOR_SCHEME_SNIPPET: colorSnippet
  });
}

export function buildVariants(input: CustomerInput, options: { promptMode?: PromptMode } = {}): BuiltVariant[] {
  const data = InputSchema.parse(input);
  const style = getStyle(data.styleId);
  const lines = splitLines(data.text);

  if (data.pendantFinish === 'plain') {
    const templatePath = getTemplatePath(style.id, style.templateKey);
    const raw = fs.readFileSync(templatePath, 'utf8');
    const plainColor = data.plainColor!;
    const plainMetal = data.plainMetal!;
    const plainChain = data.plainChain!;
    const attachments: string[] = [];
    if (style.assets?.pendantRef) {
      attachments.push(path.join(process.cwd(), style.assets.pendantRef));
    }
    const uniqueAttachments = Array.from(new Set(attachments));

    return [1, 2].map((variant) => {
      const v = style.variantMatrix[variant - 1];
      const finalLines = v.forceAllCaps ?? style.defaults.forceAllCaps
        ? lines.map(line => line.toUpperCase())
        : lines;
      const prompt = renderTemplate(raw, {
        TEXT: finalLines.join(' '),
        LINES_ARRAY: JSON.stringify(finalLines),
        PLAIN_STYLE: style.label,
        PLAIN_FONT: style.defaults.font ?? style.label,
        PLAIN_REFERENCE: style.assets?.pendantRef ? path.basename(style.assets.pendantRef) : 'attached plain pendant reference',
        PLAIN_COLOR: plainColor,
        PLAIN_COLOR_LABEL: plainColorLabel(plainColor),
        PLAIN_METAL: plainMetal,
        PLAIN_METAL_LABEL: plainMetalLabel(plainMetal),
        PLAIN_KARAT: data.plainKarat ?? 'none',
        PLAIN_KARAT_LABEL: plainKaratLabel(data.plainKarat),
        PLAIN_CHAIN: plainChain,
        PLAIN_CHAIN_LABEL: plainChainLabel(plainChain),
        VIEW: style.defaults.view,
        DEVIATION: v.deviationStrength ?? style.defaults.deviationStrength
      });

      return { variant: variant as 1|2, prompt: addVariantCompositionGuidance(prompt, variant), attachments: uniqueAttachments };
    });
  }

  const useNaturalLanguage = options.promptMode === 'natural_language'
    && Boolean(style.naturalLanguageTemplateKey)
    && Boolean(style.naturalLanguageSnippetsKey);
  const templatePath = getTemplatePath(style.id, useNaturalLanguage ? style.naturalLanguageTemplateKey! : style.templateKey);
  const raw = fs.readFileSync(templatePath, 'utf8');
  const naturalLanguageSnippets = useNaturalLanguage
    ? loadNaturalLanguageSnippets(style.id, style.naturalLanguageSnippetsKey!)
    : null;

  const baseFont = style.defaults.font ?? 'inherit_source_style';

  const attachments: string[] = [];
  if (style.assets?.pendantRef) {
    attachments.push(path.join(process.cwd(), style.assets.pendantRef));
  }
  if (style.assets?.bailRef) {
    attachments.push(path.join(process.cwd(), style.assets.bailRef));
  }
  const emblem = data.emblem ?? 'none';
  const primaryMetal = data.primaryMetal!;
  const twoTone = data.twoTone ?? false;

  if (emblem !== 'none') {
    const emblemRef = style.assets?.emblemRefs?.[emblem];
    if (emblemRef) attachments.push(path.join(process.cwd(), emblemRef));
  }

  const uniqueAttachments = Array.from(new Set(attachments));
  return [1, 2].map((variant) => {
    const v = style.variantMatrix[variant - 1];
    const merged = {
      deviation: v.deviationStrength ?? style.defaults.deviationStrength,
      bubble: v.bubbleOutline ?? style.defaults.bubbleOutline,
      caps: v.forceAllCaps ?? style.defaults.forceAllCaps,
      view: style.defaults.view
    };

    const finalLines = merged.caps ? lines.map(line => line.toUpperCase()) : lines;
    const schemeType = twoTone ? 'two_tone' : 'single_tone';
    const secondary = twoTone ? (data.secondaryMetal ?? primaryMetal) : primaryMetal;
    const capsPolicy = merged.caps ? 'forced_all_caps' : 'as_typed';
    const colorScheme = schemeType === 'two_tone'
      ? `${schemeType} ${primaryMetal} + ${secondary}`
      : `${schemeType} ${primaryMetal}`;

    const prompt = naturalLanguageSnippets
      ? buildNaturalLanguagePrompt({
          raw,
          snippets: naturalLanguageSnippets,
          text: finalLines.join(' '),
          emblem,
          twoTone,
          primaryMetal,
          secondaryMetal: secondary
        })
      : renderTemplate(raw, {
          TEXT: finalLines.join(' '),
          LINES_ARRAY: JSON.stringify(finalLines),
          DEVIATION: merged.deviation,
          PENDANT_REF: style.assets?.pendantRef ? path.basename(style.assets.pendantRef) : 'attached pendant reference',
          BAIL_REF: style.assets?.bailRef ? path.basename(style.assets.bailRef) : 'use pendant reference for bail style',
          FONT: baseFont,
          EMBLEM: emblem,
          SCHEME_TYPE: schemeType,
          PRIMARY_METAL: primaryMetal,
          SECONDARY_METAL: secondary,
          COLOR_SCHEME: colorScheme,
          CAPS_POLICY: capsPolicy,
          BUBBLE_OUTLINE: merged.bubble,
          BUBBLE_OUTLINE_ENABLED: merged.bubble,
          VIEW: merged.view
        });

    return { variant: variant as 1|2, prompt: addVariantCompositionGuidance(prompt, variant), attachments: uniqueAttachments };
  });
}
