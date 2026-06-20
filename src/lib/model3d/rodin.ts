const RODIN_MODEL = "hyper3d/rodin-v2.5/image-to-3d";
const RODIN_ENDPOINT = "https://api.wavespeed.ai/api/v3/hyper3d/rodin-v2.5/image-to-3d";
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

export type Model3dGenerationResult = {
  modelUrl: string;
  modelId: string;
  providerJobId: string;
};

export function buildModel3dPrompt() {
  const configured = process.env.MODEL3D_PROMPT?.trim();
  if (configured) return configured;
  return [
    "A photorealistic 3D asset rendering of a luxury custom jewelry pendant, stylized lettering, embedded with dense micro pave VVS diamonds.",
    "",
    "The pendant exhibits high detail, accurate proportions, and natural lighting reflections on the polished metal and gemstones. The back is blank metal, showing depth and craftsmanship suitable for 3D modeling."
  ].join("\n");
}

function getApiKey() {
  const apiKey = process.env.WAVESPEED_API_KEY?.trim().replace(/^Bearer\s+/i, "");
  if (!apiKey) throw new Error("WAVESPEED_API_KEY is not configured.");
  return apiKey;
}

function getTier() {
  return process.env.MODEL3D_TIER?.trim() || "Gen-2.5-High";
}

function getPollTimeoutMs() {
  const parsed = Number(process.env.MODEL3D_POLL_TIMEOUT_MS ?? "180000");
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
  if (payload.code === 401) {
    throw new Error("Wavespeed API authentication failed. Check WAVESPEED_API_KEY and make sure the key has been activated with a top-up.");
  }
  if (payload.data?.error) throw new Error(payload.data.error);
  if (payload.message && payload.code && payload.code >= 400) throw new Error(payload.message);
}

function responseErrorMessage(response: Response, payload: WavespeedResponse, action: "submit" | "poll") {
  if (response.status === 401 || payload.code === 401) {
    return "Wavespeed API authentication failed. Check WAVESPEED_API_KEY and make sure the key has been activated with a top-up.";
  }
  return payload.message ?? `Wavespeed ${action} failed with HTTP ${response.status}.`;
}

async function submitRodinTask({ imageUrl, prompt, format }: { imageUrl: string; prompt: string; format: string }) {
  const response = await fetch(RODIN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`
    },
    body: JSON.stringify({
      images: [imageUrl],
      prompt,
      geometry_file_format: format,
      tier: getTier(),
      use_original_alpha: false,
      material: "All",
      quality_and_mesh: "150K Triangle",
      texture_mode: "medium",
      geometry_instruct_mode: "creative",
      hd_texture: true,
      texture_delight: false,
      is_symmetric: "unknown",
      is_micro: false,
      ta_pose: false,
      preview_render: false
    })
  });

  const payload = await readJson(response);
  if (!response.ok) throw new Error(responseErrorMessage(response, payload, "submit"));
  assertOkPayload(payload);

  const jobId = payload.data?.id;
  if (!jobId) throw new Error("Wavespeed did not return a prediction id.");

  return {
    jobId,
    modelId: payload.data?.model ?? RODIN_MODEL,
    immediateModelUrl: outputsToUrl(payload.data?.outputs),
    status: payload.data?.status
  };
}

async function pollRodinTask(jobId: string) {
  const response = await fetch(`${WAVESPEED_RESULT_ENDPOINT}/${jobId}/result`, {
    headers: { Authorization: `Bearer ${getApiKey()}` }
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(responseErrorMessage(response, payload, "poll"));
  assertOkPayload(payload);
  return payload.data;
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateRodinModel({
  imageUrl,
  prompt,
  format = "glb"
}: {
  imageUrl: string;
  prompt: string;
  format?: string;
}): Promise<Model3dGenerationResult> {
  const submitted = await submitRodinTask({ imageUrl, prompt, format });
  if (submitted.status === "completed" && submitted.immediateModelUrl) {
    return {
      modelUrl: submitted.immediateModelUrl,
      modelId: submitted.modelId,
      providerJobId: submitted.jobId
    };
  }

  const startedAt = Date.now();
  const timeoutMs = getPollTimeoutMs();

  while (Date.now() - startedAt < timeoutMs) {
    await wait(3000);
    const data = await pollRodinTask(submitted.jobId);
    const status = data?.status?.trim();
    if (status === "failed") throw new Error(data?.error || "Wavespeed 3D generation failed.");
    if (status === "completed") {
      const modelUrl = outputsToUrl(data?.outputs);
      if (!modelUrl) throw new Error("Wavespeed completed but did not return a model URL.");
      return {
        modelUrl,
        modelId: data?.model ?? submitted.modelId,
        providerJobId: data?.id ?? submitted.jobId
      };
    }
  }

  throw new Error("Wavespeed 3D generation timed out.");
}
