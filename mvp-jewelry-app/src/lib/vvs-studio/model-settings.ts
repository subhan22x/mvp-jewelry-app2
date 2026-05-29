import { prisma } from "@/server/db/client";
import type { VvsImageProvider } from "./types";

const DEFAULTS = {
  imageProvider: "gemini" as VvsImageProvider,
  geminiImageModel: "gemini-3-pro-image-preview",
  openaiImageModel: "gpt-image-1",
  videoProvider: "wavespeed",
  wavespeedVideoModel: "bytedance/seedance-2.0-fast/image-to-video",
};

const KEYS = {
  imageProvider: "vvs_studio.image_provider",
  geminiImageModel: "vvs_studio.gemini_image_model",
  openaiImageModel: "vvs_studio.openai_image_model",
  videoProvider: "vvs_studio.video_provider",
  wavespeedVideoModel: "vvs_studio.wavespeed_video_model",
};

export async function getVvsModelSettings(accountId: string) {
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: Object.values(KEYS).map(k => `${accountId}:${k}`),
      },
    },
  });
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));

  const get = (k: string, fallback: string) => map[`${accountId}:${k}`] ?? fallback;

  return {
    imageProvider: get(KEYS.imageProvider, DEFAULTS.imageProvider) as VvsImageProvider,
    geminiImageModel: get(KEYS.geminiImageModel, DEFAULTS.geminiImageModel),
    openaiImageModel: get(KEYS.openaiImageModel, DEFAULTS.openaiImageModel),
    videoProvider: get(KEYS.videoProvider, DEFAULTS.videoProvider),
    wavespeedVideoModel: get(KEYS.wavespeedVideoModel, DEFAULTS.wavespeedVideoModel),
  };
}

export async function patchVvsModelSettings(
  accountId: string,
  patch: Partial<{
    imageProvider: VvsImageProvider;
    geminiImageModel: string;
    openaiImageModel: string;
    videoProvider: string;
    wavespeedVideoModel: string;
  }>
) {
  const entries: { key: string; value: string }[] = [];
  if (patch.imageProvider) entries.push({ key: KEYS.imageProvider, value: patch.imageProvider });
  if (patch.geminiImageModel) entries.push({ key: KEYS.geminiImageModel, value: patch.geminiImageModel });
  if (patch.openaiImageModel) entries.push({ key: KEYS.openaiImageModel, value: patch.openaiImageModel });
  if (patch.videoProvider) entries.push({ key: KEYS.videoProvider, value: patch.videoProvider });
  if (patch.wavespeedVideoModel) entries.push({ key: KEYS.wavespeedVideoModel, value: patch.wavespeedVideoModel });

  await Promise.all(
    entries.map(({ key, value }) =>
      prisma.appSetting.upsert({
        where: { key: `${accountId}:${key}` },
        create: { key: `${accountId}:${key}`, accountId, value },
        update: { value },
      })
    )
  );
}
