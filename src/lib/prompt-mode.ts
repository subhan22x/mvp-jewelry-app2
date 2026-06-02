import { prisma } from "@/server/db/client";

export type PromptMode = "json" | "natural_language";

export const PROMPT_MODE_SETTING_KEY = "name_prompt_mode";
export const PROMPT_MODES: PromptMode[] = ["json", "natural_language"];

export function parsePromptMode(value: unknown): PromptMode {
  return value === "natural_language" ? "natural_language" : "json";
}

export function promptModeLabel(mode: PromptMode) {
  return mode === "natural_language" ? "Natural language" : "JSON";
}

function promptModeSettingKey(accountId: string) {
  return `${accountId}:${PROMPT_MODE_SETTING_KEY}`;
}

export async function getNamePromptMode(accountId: string): Promise<PromptMode> {
  const configured = parsePromptMode(process.env.NAME_PROMPT_MODE);

  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: promptModeSettingKey(accountId) }
    });
    return parsePromptMode(setting?.value ?? configured);
  } catch {
    // Older local DBs may not have the settings table until migrations run.
    return configured;
  }
}

export async function setNamePromptMode(accountId: string, mode: PromptMode) {
  const key = promptModeSettingKey(accountId);
  return prisma.appSetting.upsert({
    where: { key },
    update: { value: mode },
    create: { key, accountId, value: mode }
  });
}
