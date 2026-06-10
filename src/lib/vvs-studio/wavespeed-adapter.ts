import fs from "node:fs/promises";
import path from "node:path";
import { assertDurableMediaStorageConfigured, isR2Configured, uploadToR2 } from "../storage/r2";
import type { VvsGenerationProfile } from "./prompt-profiles";

const WAVESPEED_API_BASE = "https://api.wavespeed.ai/api/v3";
const WAVESPEED_RESULT_ENDPOINT = `${WAVESPEED_API_BASE}/predictions`;
const GENERATED_DIR = process.env.GENERATED_IMAGE_DIR ?? path.join(process.cwd(), "public", "generated");

type PredictionData = {
  id?: string;
  model?: string;
  outputs?: unknown;
  status?: string;
  error?: string;
};

type WavespeedResponse = {
  code?: number;
  message?: string;
  data?: PredictionData;
};

export type WavespeedSubmitResult = {
  providerJobId: string;
  modelId: string;
  status?: string;
  immediateOutputUrl?: string;
  payload: WavespeedResponse;
};

export type WavespeedPollResult = {
  status: "pending" | "succeeded" | "failed";
  outputUrl?: string;
  error?: string;
  payload: WavespeedResponse;
};

function getApiKey() {
  const apiKey = process.env.WAVESPEED_API_KEY;
  if (!apiKey) throw new Error("WAVESPEED_API_KEY is not configured.");
  return apiKey;
}

function endpointForModel(modelId: string) {
  return `${WAVESPEED_API_BASE}/${modelId.replace(/^\/+/, "")}`;
}

async function readJson(response: Response): Promise<WavespeedResponse> {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as WavespeedResponse;
  } catch {
    throw new Error(text);
  }
}

function assertOkPayload(payload: WavespeedResponse) {
  if (payload.data?.error) throw new Error(payload.data.error);
  if (payload.message && payload.code && payload.code >= 400) throw new Error(payload.message);
}

function outputsToUrl(outputs: unknown) {
  if (Array.isArray(outputs)) {
    const first = outputs.find(output => typeof output === "string");
    return typeof first === "string" ? first : null;
  }
  if (typeof outputs === "string") return outputs;
  if (outputs && typeof outputs === "object") {
    for (const value of Object.values(outputs as Record<string, unknown>)) {
      if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
      if (Array.isArray(value)) {
        const nested = value.find(item => typeof item === "string" && /^https?:\/\//i.test(item));
        if (typeof nested === "string") return nested;
      }
    }
  }
  return null;
}

function normalizeStatus(status: string | undefined): WavespeedPollResult["status"] {
  if (status === "completed" || status === "succeeded" || status === "success") return "succeeded";
  if (status === "failed" || status === "error") return "failed";
  return "pending";
}

export async function submitImageEdit({
  profile,
  prompt,
  imageUrls,
}: {
  profile: VvsGenerationProfile;
  prompt: string;
  imageUrls: string[];
}): Promise<WavespeedSubmitResult> {
  const response = await fetch(endpointForModel(profile.modelId), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      prompt,
      images: imageUrls,
      image: imageUrls[0],
      ...profile.params,
    }),
  });

  const payload = await readJson(response);
  if (!response.ok) throw new Error(payload.message ?? `Wavespeed image submit failed with HTTP ${response.status}.`);
  assertOkPayload(payload);

  const providerJobId = payload.data?.id;
  if (!providerJobId) throw new Error("Wavespeed did not return an image prediction id.");

  return {
    providerJobId,
    modelId: payload.data?.model ?? profile.modelId,
    status: payload.data?.status,
    immediateOutputUrl: outputsToUrl(payload.data?.outputs) ?? undefined,
    payload,
  };
}

export async function submitImageToVideo({
  profile,
  prompt,
  firstImageUrl,
  lastImageUrl,
}: {
  profile: VvsGenerationProfile;
  prompt: string;
  firstImageUrl: string;
  lastImageUrl: string;
}): Promise<WavespeedSubmitResult> {
  const response = await fetch(endpointForModel(profile.modelId), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      prompt,
      image: firstImageUrl,
      last_image: lastImageUrl,
      ...profile.params,
    }),
  });

  const payload = await readJson(response);
  if (!response.ok) throw new Error(payload.message ?? `Wavespeed video submit failed with HTTP ${response.status}.`);
  assertOkPayload(payload);

  const providerJobId = payload.data?.id;
  if (!providerJobId) throw new Error("Wavespeed did not return a video prediction id.");

  return {
    providerJobId,
    modelId: payload.data?.model ?? profile.modelId,
    status: payload.data?.status,
    immediateOutputUrl: outputsToUrl(payload.data?.outputs) ?? undefined,
    payload,
  };
}

export async function pollWavespeedJob(providerJobId: string): Promise<WavespeedPollResult> {
  const response = await fetch(`${WAVESPEED_RESULT_ENDPOINT}/${providerJobId}/result`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(payload.message ?? `Wavespeed poll failed with HTTP ${response.status}.`);
  assertOkPayload(payload);

  const status = normalizeStatus(payload.data?.status);
  return {
    status,
    outputUrl: outputsToUrl(payload.data?.outputs) ?? undefined,
    error: payload.data?.error,
    payload,
  };
}

function extensionFromContentType(contentType: string | null, fallback: string) {
  if (!contentType) return fallback;
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return ".jpg";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("mp4")) return ".mp4";
  if (contentType.includes("quicktime")) return ".mov";
  if (contentType.includes("webm")) return ".webm";
  return fallback;
}

async function saveRemoteMedia({
  remoteUrl,
  keyPrefix,
  id,
  fallbackExtension,
}: {
  remoteUrl: string;
  keyPrefix: string;
  id: string;
  fallbackExtension: string;
}) {
  const response = await fetch(remoteUrl);
  if (!response.ok) throw new Error(`Unable to download generated media. HTTP ${response.status}.`);

  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  const ext = extensionFromContentType(contentType, fallbackExtension);
  const fileName = `${id}${ext}`;
  const buffer = Buffer.from(await response.arrayBuffer());

  if (isR2Configured()) {
    return uploadToR2({
      key: `${keyPrefix}/${fileName}`,
      body: buffer,
      contentType,
    });
  }

  assertDurableMediaStorageConfigured();
  const dir = path.join(GENERATED_DIR, keyPrefix);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), buffer);
  return `/generated/${keyPrefix}/${fileName}`;
}

export function saveRemoteVvsImage(remoteUrl: string, imageGenerationId: string) {
  return saveRemoteMedia({
    remoteUrl,
    keyPrefix: "vvs-studio/generated-images",
    id: imageGenerationId,
    fallbackExtension: ".png",
  });
}

export function saveRemoteVvsVideo(remoteUrl: string, videoGenerationId: string) {
  return saveRemoteMedia({
    remoteUrl,
    keyPrefix: "vvs-studio/generated-videos",
    id: videoGenerationId,
    fallbackExtension: ".mp4",
  });
}
