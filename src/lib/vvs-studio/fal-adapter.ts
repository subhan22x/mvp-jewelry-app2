import type { VvsGenerationProfile } from "./prompt-profiles";

const FAL_QUEUE_BASE = "https://queue.fal.run";

type FalQueueResponse = {
  request_id?: string;
  response_url?: string;
  status_url?: string;
  cancel_url?: string;
  queue_position?: number;
  status?: string;
  logs?: unknown;
  metrics?: unknown;
  error?: string;
  error_type?: string;
};

type FalImageResult = {
  images?: Array<{
    url?: string;
    width?: number;
    height?: number;
    content_type?: string;
    file_name?: string;
    file_size?: number;
  }>;
  image?: { url?: string };
  prompt?: string;
  seed?: number;
  error?: string;
};

export type FalSubmitResult = {
  providerJobId: string;
  modelId: string;
  payload: FalQueueResponse;
};

export type FalPollResult = {
  status: "pending" | "succeeded" | "failed";
  outputUrl?: string;
  error?: string;
  payload: {
    status?: FalQueueResponse;
    result?: FalImageResult;
  };
};

function getFalApiKey() {
  const apiKey = process.env.FAL_KEY ?? process.env.FAL_API_KEY;
  if (!apiKey) throw new Error("FAL_KEY is not configured.");
  return apiKey;
}

function endpointForModel(modelId: string) {
  return `${FAL_QUEUE_BASE}/${modelId.replace(/^\/+/, "")}`;
}

function requestUrls(modelId: string, providerJobId: string) {
  const requestModelId = modelId.replace(/\/edit$/, "");
  const base = `${endpointForModel(requestModelId)}/requests/${providerJobId}`;
  return {
    statusUrl: `${base}/status`,
    responseUrl: base,
  };
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text);
  }
}

async function falJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Key ${getFalApiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = await readJson<T>(response);
  if (!response.ok) {
    const message = typeof (payload as { error?: unknown }).error === "string" ? (payload as { error: string }).error : null;
    throw new Error(message ?? `fal request failed with HTTP ${response.status}.`);
  }
  return payload;
}

function imageResultUrl(result: FalImageResult | undefined) {
  const first = result?.images?.find(image => typeof image.url === "string");
  if (first?.url) return first.url;
  return result?.image?.url;
}

function falStatusToPollResult(status: FalQueueResponse["status"]): FalPollResult["status"] {
  if (status === "COMPLETED") return "succeeded";
  if (status === "FAILED" || status === "ERROR" || status === "CANCELLED" || status === "CANCELED") return "failed";
  return "pending";
}

export async function submitFalImageEdit({
  profile,
  prompt,
  imageUrls,
}: {
  profile: VvsGenerationProfile;
  prompt: string;
  imageUrls: string[];
}): Promise<FalSubmitResult> {
  const payload = await falJson<FalQueueResponse>(endpointForModel(profile.modelId), {
    method: "POST",
    body: JSON.stringify({
      prompt,
      image_urls: imageUrls,
      ...profile.params,
    }),
  });

  if (!payload.request_id) throw new Error("fal did not return a request_id.");
  return {
    providerJobId: payload.request_id,
    modelId: profile.modelId,
    payload,
  };
}

export async function pollFalImageEdit({
  profile,
  providerJobId,
}: {
  profile: VvsGenerationProfile;
  providerJobId: string;
}): Promise<FalPollResult> {
  const urls = requestUrls(profile.modelId, providerJobId);
  const status = await falJson<FalQueueResponse>(`${urls.statusUrl}?logs=1`);
  const normalized = falStatusToPollResult(status.status);

  if (normalized === "failed") {
    return {
      status: "failed",
      error: status.error ?? status.error_type ?? "fal image edit failed.",
      payload: { status },
    };
  }

  if (normalized === "pending") {
    return {
      status: "pending",
      payload: { status },
    };
  }

  const result = await falJson<FalImageResult>(status.response_url ?? urls.responseUrl);
  const outputUrl = imageResultUrl(result);
  return {
    status: outputUrl ? "succeeded" : "failed",
    outputUrl,
    error: outputUrl ? undefined : result.error ?? "fal image edit completed without an output image.",
    payload: { status, result },
  };
}
