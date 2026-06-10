import { z } from "zod";
import { prisma } from "@/server/db/client";

export type StyleTextReferenceOptions = {
  backgroundColor?: string;
  fillColor?: string;
  outlineColor?: string;
  outlineWidth?: number;
};

export type StylePromptOverride = {
  templateRaw?: string;
  naturalLanguageTemplateRaw?: string;
  attachTextReference?: boolean;
  textReferenceOptions?: StyleTextReferenceOptions;
  updatedAt?: string;
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const TextReferenceOptionsSchema = z.object({
  backgroundColor: z.string().regex(HEX_COLOR).optional(),
  fillColor: z.string().regex(HEX_COLOR).optional(),
  outlineColor: z.string().regex(HEX_COLOR).optional(),
  outlineWidth: z.coerce.number().int().min(0).max(96).optional()
});

const StylePromptOverrideSchema = z.object({
  templateRaw: z.string().optional(),
  naturalLanguageTemplateRaw: z.string().optional(),
  attachTextReference: z.boolean().optional(),
  textReferenceOptions: TextReferenceOptionsSchema.optional(),
  updatedAt: z.string().optional()
});

export function styleOverrideSettingKey(accountId: string, styleId: string) {
  return `${accountId}:style_override:${styleId}`;
}

export function normalizeTextReferenceOptions(input: unknown): StyleTextReferenceOptions {
  return TextReferenceOptionsSchema.parse(input);
}

export function normalizeStylePromptOverride(input: unknown): StylePromptOverride {
  const parsed = StylePromptOverrideSchema.parse(input);
  return {
    ...parsed,
    updatedAt: parsed.updatedAt ?? new Date().toISOString()
  };
}

export async function loadStyleOverride(accountId: string, styleId: string) {
  const setting = await prisma.appSetting.findUnique({
    where: { key: styleOverrideSettingKey(accountId, styleId) }
  });
  if (!setting) return null;

  try {
    return normalizeStylePromptOverride(JSON.parse(setting.value));
  } catch {
    return null;
  }
}

export async function saveStyleOverride(accountId: string, styleId: string, override: StylePromptOverride) {
  const normalized = normalizeStylePromptOverride(override);
  await prisma.appSetting.upsert({
    where: { key: styleOverrideSettingKey(accountId, styleId) },
    create: {
      key: styleOverrideSettingKey(accountId, styleId),
      accountId,
      value: JSON.stringify(normalized)
    },
    update: {
      value: JSON.stringify(normalized)
    }
  });
  return normalized;
}

export async function clearStyleOverride(accountId: string, styleId: string) {
  await prisma.appSetting.deleteMany({
    where: {
      key: styleOverrideSettingKey(accountId, styleId),
      accountId
    }
  });
}
