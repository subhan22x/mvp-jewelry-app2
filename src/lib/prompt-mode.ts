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

export async function getNamePromptMode(): Promise<PromptMode> {
  const configured = parsePromptMode(process.env.NAME_PROMPT_MODE);

  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: PROMPT_MODE_SETTING_KEY }
    });
    return parsePromptMode(setting?.value ?? configured);
  } catch {
    // Older local DBs may not have the settings table until migrations run.
    return configured;
  }
}

export async function setNamePromptMode(mode: PromptMode) {
  return prisma.appSetting.upsert({
    where: { key: PROMPT_MODE_SETTING_KEY },
    update: { value: mode },
    create: { key: PROMPT_MODE_SETTING_KEY, value: mode }
  });
}
