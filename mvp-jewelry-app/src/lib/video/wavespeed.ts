const WAVESPEED_SEEDANCE_MODEL = "bytedance/seedance-2.0/image-to-video";
const WAVESPEED_SEEDANCE_ENDPOINT = "https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/image-to-video";
const WAVESPEED_RESULT_ENDPOINT = "https://api.wavespeed.ai/api/v3/predictions";

type PredictionData = {
  id?: string;
  model?: string;
  outputs?: unknown;
  status?: string;
  error?: string;
  timings?: { inference?: number };
};

type WavespeedResponse = {
  code?: number;
  message?: string;
  data?: PredictionData;
};

export type VideoGenerationResult = {
  videoUrl: string;
  modelId: string;
  providerJobId: string;
};

export function buildJewelryVideoPrompt() {
  const configuredPrompt = process.env.VIDEO_PROMPT?.trim();
  if (configuredPrompt) return configuredPrompt;

  return "Cinematic ultra realistic macro product film of this Jewelry Pendant. The piece is heavily encrusted with VVS diamonds and exhibit prismatic light refractions under studio lighting. This video is filmed on a gimbal stabilized iphone 16 pro max Camera Movement: A series of smooth tracking pans, macro zooms (but do not zoom in too close, try to keep atleast half of the object in frame) and lock on arc shots. The camera glides along the edges of the jewelry piece and hovers over the diamond-paved surfaces. Lighting & Environment: Professional studio lighting. realistic shimmering highlights. The background is a deep black velvet to provide a luxury texture. Style: Hyper-realistic, 8k resolution, elegant, prestigious atmosphere, extremely detailed textures, 60fps.";
}

function getApiKey() {
  const apiKey = process.env.WAVESPEED_API_KEY;
  if (!apiKey) throw new Error("WAVESPEED_API_KEY is not configured.");
  return apiKey;
}

function getVideoDuration() {
  const parsed = Number(process.env.VIDEO_DURATION_SECONDS ?? "7");
  if (!Number.isFinite(parsed)) return 7;
  return Math.min(15, Math.max(4, Math.round(parsed)));
}

function getVideoResolution() {
  const resolution = process.env.VIDEO_RESOLUTION ?? "720p";
  if (resolution === "480p" || resolution === "720p" || resolution === "1080p") return resolution;
  return "720p";
}

function getGenerateAudio() {
  return process.env.VIDEO_GENERATE_AUDIO === "true";
}

function getPollTimeoutMs() {
  const parsed = Number(process.env.VIDEO_POLL_TIMEOUT_MS ?? "180000");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 180000;
}

function outputsToUrl(outputs: unknown) {
  if (Array.isArray(outputs)) {
    const first = outputs.find(output => typeof output === "string");
    return typeof first === "string" ? first : null;
  }
  if (typeof outputs === "string") return outputs;
  return null;
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

async function submitSeedanceTask({ imageUrl, prompt }: { imageUrl: string; prompt: string }) {
  const response = await fetch(WAVESPEED_SEEDANCE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`
    },
    body: JSON.stringify({
      prompt,
      image: imageUrl,
      resolution: getVideoResolution(),
      duration: getVideoDuration(),
      enable_web_search: false,
      generate_audio: getGenerateAudio()
    })
  });

  const payload = await readJson(response);
  if (!response.ok) throw new Error(payload.message ?? `Wavespeed submit failed with HTTP ${response.status}.`);
  assertOkPayload(payload);

  const jobId = payload.data?.id;
  if (!jobId) throw new Error("Wavespeed did not return a prediction id.");

  return {
    jobId,
    modelId: payload.data?.model ?? WAVESPEED_SEEDANCE_MODEL,
    immediateVideoUrl: outputsToUrl(payload.data?.outputs),
    status: payload.data?.status
  };
}

async function pollSeedanceTask(jobId: string) {
  const response = await fetch(`${WAVESPEED_RESULT_ENDPOINT}/${jobId}/result`, {
    headers: { Authorization: `Bearer ${getApiKey()}` }
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(payload.message ?? `Wavespeed poll failed with HTTP ${response.status}.`);
  assertOkPayload(payload);
  return payload.data;
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateSeedanceVideo({ imageUrl, prompt }: { imageUrl: string; prompt: string }): Promise<VideoGenerationResult> {
  const submitted = await submitSeedanceTask({ imageUrl, prompt });
  if (submitted.status === "completed" && submitted.immediateVideoUrl) {
    return {
      videoUrl: submitted.immediateVideoUrl,
      modelId: submitted.modelId,
      providerJobId: submitted.jobId
    };
  }

  const startedAt = Date.now();
  const timeoutMs = getPollTimeoutMs();

  while (Date.now() - startedAt < timeoutMs) {
    await wait(3000);
    const data = await pollSeedanceTask(submitted.jobId);
    const status = data?.status?.trim();
    if (status === "failed") throw new Error(data?.error || "Wavespeed video generation failed.");
    if (status === "completed") {
      const videoUrl = outputsToUrl(data?.outputs);
      if (!videoUrl) throw new Error("Wavespeed completed but did not return a video URL.");
      return {
        videoUrl,
        modelId: data?.model ?? submitted.modelId,
        providerJobId: data?.id ?? submitted.jobId
      };
    }
  }

  throw new Error("Wavespeed video generation timed out.");
}
