import path from 'node:path';
import { getStyle, getTemplatePath, getOptionalTemplatePath } from './registry';
import { buildVariants } from './builder';
import type { CustomerInput, StyleConfig } from './_types';
import type { PromptMode } from '../prompt-mode';
import type { StylePromptOverride } from './style-overrides';

export type InspectOptions = {
  promptMode?: PromptMode;
  styleOverride?: StylePromptOverride;
};

export type StyleInspection = {
  styleId: string;
  styleLabel: string;
  styleYmlPath: string;
  templatePath: string;
  templateKey: string;
  naturalLanguageTemplatePath: string | null;
  naturalLanguageSnippetsPath: string | null;
  defaults: StyleConfig['defaults'];
  variantMatrix: StyleConfig['variantMatrix'];
  emblemsAllowed: StyleConfig['emblemsAllowed'];
  variants: Array<{
    variant: 1 | 2;
    prompt: string;
    attachments: string[];
  }>;
};

function styleYmlPath(styleId: string): string {
  return path.join(process.cwd(), 'src', 'lib', 'styles', styleId, 'style.yml');
}

function snippetsPath(styleId: string, snippetsKey: string): string {
  return path.join(process.cwd(), 'src', 'lib', 'styles', styleId, `${snippetsKey}.yml`);
}

/**
 * Introspect a style + customer input without calling the image provider.
 *
 * Reuses buildVariants so the prompt and attachments shown to the owner are
 * exactly what the customer flow would send. Also surfaces the on-disk source
 * paths (style.yml + template) so prompts can be edited confidently.
 *
 * This is intended for internal owner tooling (Generation Lab). It must not be
 * used to bypass the customer-facing build pipeline.
 */
export function inspectStyle(input: CustomerInput, options: InspectOptions = {}): StyleInspection {
  const style = getStyle(input.styleId);
  const useNaturalLanguage = options.promptMode === 'natural_language'
    && Boolean(style.naturalLanguageTemplateKey)
    && Boolean(style.naturalLanguageSnippetsKey);
  const activeTemplateKey = useNaturalLanguage
    ? style.naturalLanguageTemplateKey!
    : style.templateKey;

  const templatePath = getTemplatePath(style.id, activeTemplateKey);

  const naturalLanguageTemplatePath = style.naturalLanguageTemplateKey
    ? getOptionalTemplatePath(style.id, style.naturalLanguageTemplateKey)
    : null;
  const naturalLanguageSnippetsPath = style.naturalLanguageSnippetsKey
    ? snippetsPath(style.id, style.naturalLanguageSnippetsKey)
    : null;

  const variants = buildVariants(input, {
    promptMode: options.promptMode,
    styleOverride: options.styleOverride
  });

  return {
    styleId: style.id,
    styleLabel: style.label,
    styleYmlPath: styleYmlPath(style.id),
    templatePath,
    templateKey: activeTemplateKey,
    naturalLanguageTemplatePath,
    naturalLanguageSnippetsPath,
    defaults: style.defaults,
    variantMatrix: style.variantMatrix,
    emblemsAllowed: style.emblemsAllowed,
    variants: variants.map(v => ({ variant: v.variant, prompt: v.prompt, attachments: v.attachments }))
  };
}
