import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import YAML from 'yaml';
import { getSnippetPath, getStyle, getTemplatePath } from './registry';
import { renderTemplate } from './utils';
import type { BuiltVariant, CustomerInput, Emblem } from './_types';
import type { PromptMode } from '../prompt-mode';

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
  const useNaturalLanguage = options.promptMode === 'natural_language'
    && Boolean(style.naturalLanguageTemplateKey)
    && Boolean(style.naturalLanguageSnippetsKey);
  const templatePath = getTemplatePath(style.id, useNaturalLanguage ? style.naturalLanguageTemplateKey! : style.templateKey);
  const raw = fs.readFileSync(templatePath, 'utf8');
  const naturalLanguageSnippets = useNaturalLanguage
    ? loadNaturalLanguageSnippets(style.id, style.naturalLanguageSnippetsKey!)
    : null;

  const lines = splitLines(data.text);
  const baseFont = style.defaults.font ?? 'inherit_source_style';

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
  return [1, 2].map((variant) => {
    const v = style.variantMatrix[variant - 1];
    const merged = {
      deviation: v.deviationStrength ?? style.defaults.deviationStrength,
      bubble: v.bubbleOutline ?? style.defaults.bubbleOutline,
      caps: v.forceAllCaps ?? style.defaults.forceAllCaps,
      view: style.defaults.view
    };

    const finalLines = merged.caps ? lines.map(line => line.toUpperCase()) : lines;
    const schemeType = data.twoTone ? 'two_tone' : 'single_tone';
    const secondary = data.twoTone ? (data.secondaryMetal ?? data.primaryMetal) : data.primaryMetal;
    const capsPolicy = merged.caps ? 'forced_all_caps' : 'as_typed';
    const colorScheme = schemeType === 'two_tone'
      ? `${schemeType} ${data.primaryMetal} + ${secondary}`
      : `${schemeType} ${data.primaryMetal}`;

    const prompt = naturalLanguageSnippets
      ? buildNaturalLanguagePrompt({
          raw,
          snippets: naturalLanguageSnippets,
          text: finalLines.join(' '),
          emblem: data.emblem,
          twoTone: data.twoTone,
          primaryMetal: data.primaryMetal,
          secondaryMetal: secondary
        })
      : renderTemplate(raw, {
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

    return { variant: variant as 1|2, prompt: addVariantCompositionGuidance(prompt, variant), attachments: uniqueAttachments };
  });
}
