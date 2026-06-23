import { prisma } from "@/server/db/client";
import {
  IMAGE_HERO_SHOT_PROFILE,
  IMAGE_MACRO_SHOT_PROFILE,
  IMAGE_SOURCE_CLEANUP_PROFILE,
  LAST_SHOT_PROFILE,
  SOURCE_REFINE_PROFILE,
  STYLE_COMPOSITE_PROFILE,
  VIDEO_PROFILE_10S,
  VIDEO_PROFILE_6S,
  type VvsGenerationProfile,
} from "./prompt-profiles";
import { VVS_STUDIO_STYLES, type VvsStyleDefinition } from "./styles";

const CONFIG_KEY = "vvs_studio.pipeline_config";

type StoredPipelineConfig = {
  profiles?: Record<string, Partial<Pick<VvsGenerationProfile, "modelId" | "promptTemplate" | "trafficWeight" | "active">> & { params?: Record<string, unknown> }>;
  styles?: Record<string, Partial<Pick<VvsStyleDefinition, "label" | "active" | "backgroundAsset" | "placementPrompt" | "previewAsset">>>;
};

function namespacedKey(accountId: string) {
  return `${accountId}:${CONFIG_KEY}`;
}

function parseConfig(value: string | null | undefined): StoredPipelineConfig {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as StoredPipelineConfig;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function applyProfileOverride(profile: VvsGenerationProfile, config: StoredPipelineConfig): VvsGenerationProfile {
  const override = config.profiles?.[profile.id];
  if (!override) return profile;
  return {
    ...profile,
    ...override,
    params: override.params ? { ...profile.params, ...override.params } : profile.params,
  };
}

function applyStyleOverride(style: VvsStyleDefinition, config: StoredPipelineConfig): VvsStyleDefinition {
  const override = config.styles?.[style.key];
  return override ? { ...style, ...override } : style;
}

export async function getVvsPipelineSettings(accountId: string) {
  const row = await prisma.appSetting.findUnique({ where: { key: namespacedKey(accountId) } });
  const config = parseConfig(row?.value);
  return {
    profiles: {
      image_source_cleanup: applyProfileOverride(IMAGE_SOURCE_CLEANUP_PROFILE, config),
      image_hero_shot: applyProfileOverride(IMAGE_HERO_SHOT_PROFILE, config),
      image_macro_shot: applyProfileOverride(IMAGE_MACRO_SHOT_PROFILE, config),
      source_refine: applyProfileOverride(SOURCE_REFINE_PROFILE, config),
      style_composite: applyProfileOverride(STYLE_COMPOSITE_PROFILE, config),
      last_shot: applyProfileOverride(LAST_SHOT_PROFILE, config),
      video_6s: applyProfileOverride(VIDEO_PROFILE_6S, config),
      video_10s: applyProfileOverride(VIDEO_PROFILE_10S, config),
    },
    styles: VVS_STUDIO_STYLES.map(style => applyStyleOverride(style, config)).sort((a, b) => a.sortOrder - b.sortOrder),
    rawConfig: config,
  };
}

export async function patchVvsPipelineSettings(accountId: string, patch: StoredPipelineConfig) {
  const existing = await getVvsPipelineSettings(accountId);
  const merged: StoredPipelineConfig = {
    profiles: { ...(existing.rawConfig.profiles ?? {}), ...(patch.profiles ?? {}) },
    styles: { ...(existing.rawConfig.styles ?? {}), ...(patch.styles ?? {}) },
  };

  await prisma.appSetting.upsert({
    where: { key: namespacedKey(accountId) },
    create: { key: namespacedKey(accountId), accountId, value: JSON.stringify(merged) },
    update: { value: JSON.stringify(merged) },
  });

  return getVvsPipelineSettings(accountId);
}

export function canManageVvsPipelineSettings(email: string | null | undefined) {
  const configured = process.env.VVS_INTERNAL_ADMIN_EMAILS?.split(",").map(value => value.trim().toLowerCase()).filter(Boolean) ?? [];
  if (!configured.length) return false;
  return Boolean(email && configured.includes(email.toLowerCase()));
}
