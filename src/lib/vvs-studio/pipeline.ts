import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/server/db/client";
import { uploadToR2, isR2Configured } from "../storage/r2";
import { getPublicBaseUrl, assertPublicImageUrl } from "../video/public-url";
import { readVvsSourceAttachment } from "./source-storage";
import { getVvsPipelineSettings } from "./pipeline-settings";
import { renderPrompt, type VvsGenerationProfile, type VvsPipelineStage } from "./prompt-profiles";
import { generateVvsImage } from "./image-generator";
import { pollFalImageEdit, submitFalImageEdit } from "./fal-adapter";
import {
  pollWavespeedJob,
  deleteStoredVvsImage,
  saveRemoteVvsImage,
  saveRemoteVvsVideo,
  submitImageEdit,
  submitImageToVideo,
} from "./wavespeed-adapter";
import { consumeUsageCredit, ensureUsageAvailable } from "../usage";

const JOB_POLL_DELAY_MS = 10_000;
const JOB_LOCK_TTL_MS = 5 * 60_000;
const PROVIDER_INPUT_PREFIX = "vvs-studio/provider-inputs";

type JobStage = VvsPipelineStage | "save_video" | "complete";
type ImagePostStage = "image_source_cleanup" | "image_hero_shot" | "image_macro_shot";

function nowPlus(ms: number) {
  return new Date(Date.now() + ms);
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function publicAssetUrl(pathname: string) {
  const base = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!base) throw new Error("APP_BASE_URL or NEXT_PUBLIC_APP_URL is required for VVS provider assets.");
  return new URL(pathname, base).toString();
}

function publicStoredImageUrl(req: Request | null, imageUrl: string) {
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  if (!req) {
    const base = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    if (!base) throw new Error("APP_BASE_URL or NEXT_PUBLIC_APP_URL is required for VVS provider assets.");
    return new URL(imageUrl, base).toString();
  }
  return new URL(imageUrl, getPublicBaseUrl(req)).toString();
}

function styleFromSettings(settings: Awaited<ReturnType<typeof getVvsPipelineSettings>>, key: string | null | undefined) {
  return settings.styles.find(style => style.key === key && style.active) ?? null;
}

function providerProfilesForShoot(settings: Awaited<ReturnType<typeof getVvsPipelineSettings>>, durationSeconds: number | null | undefined) {
  const videoProfile = durationSeconds === 10 ? settings.profiles.video_10s : settings.profiles.video_6s;
  return {
    source_refine: settings.profiles.source_refine,
    style_composite: settings.profiles.style_composite,
    last_shot: settings.profiles.last_shot,
    video: videoProfile,
  };
}

function imagePostProfiles(settings: Awaited<ReturnType<typeof getVvsPipelineSettings>>) {
  return {
    image_source_cleanup: settings.profiles.image_source_cleanup,
    image_hero_shot: settings.profiles.image_hero_shot,
    image_macro_shot: settings.profiles.image_macro_shot,
  };
}

type ImagePostSelection = {
  profiles: Record<ImagePostStage, VvsGenerationProfile>;
  style: { key: string; backgroundAsset: string; placementPrompt: string };
};

function imagePostSelectionFromJob(job: { profileSelectionJson: string | null }, fallback: ImagePostSelection): ImagePostSelection {
  if (!job.profileSelectionJson) return fallback;
  try {
    const parsed = JSON.parse(job.profileSelectionJson) as Partial<ImagePostSelection>;
    if (parsed.profiles?.image_source_cleanup && parsed.profiles.image_hero_shot && parsed.profiles.image_macro_shot && parsed.style) {
      return parsed as ImagePostSelection;
    }
  } catch {
    // Older queued jobs did not contain a full executable snapshot.
  }
  return fallback;
}

export async function startVvsImagePostPipeline({ accountId, shootId }: { accountId: string; shootId: string }) {
  const shoot = await prisma.vvsStudioShoot.findUnique({
    where: { id: shootId },
    include: { Uploads: true },
  });
  if (!shoot || shoot.accountId !== accountId) throw new Error("Shoot not found.");
  if (shoot.pieceType && shoot.pieceType !== "pendant") throw new Error("VVS image posts currently support pendants only.");
  if (!shoot.Uploads.some(upload => upload.angle === "top")) throw new Error("Upload a top-view pendant photo before generating.");

  const settings = await getVvsPipelineSettings(accountId);
  const style = styleFromSettings(settings, shoot.visualStyle);
  if (!style) throw new Error("Choose a supported VVS image style before generating.");
  await ensureUsageAvailable(accountId, "vvs_product_post_generated");

  const activeJob = await prisma.vvsStudioJob.findFirst({
    where: { shootId: shoot.id, kind: "image_post_pipeline", status: { in: ["queued", "running"] } },
    orderBy: { createdAt: "desc" },
  });
  if (activeJob) return activeJob;

  const completedJob = await prisma.vvsStudioJob.findFirst({
    where: { shootId: shoot.id, kind: "image_post_pipeline", status: "succeeded" },
    orderBy: { createdAt: "desc" },
  });
  if (completedJob) return completedJob;

  const failedJob = await prisma.vvsStudioJob.findFirst({
    where: { shootId: shoot.id, kind: "image_post_pipeline", status: "failed" },
    orderBy: { createdAt: "desc" },
  });
  if (failedJob) {
    const retried = await prisma.vvsStudioJob.update({
      where: { id: failedJob.id },
      data: { status: "queued", attempts: 0, lockedAt: null, lockedBy: null, runAfter: new Date(), error: null, completedAt: null },
    });
    await prisma.vvsStudioShoot.update({
      where: { id: shoot.id },
      data: { status: "generating_image", error: null, completedAt: null, updatedAt: new Date() },
    });
    return retried;
  }

  const aspectRatio = shoot.aspectRatio === "four_three" ? "4:3" : "9:16";
  const baseProfiles = imagePostProfiles(settings);
  const withAspectRatio = (profile: VvsGenerationProfile): VvsGenerationProfile => {
    if (profile.provider === "fal") {
      return {
        ...profile,
        params: {
          ...profile.params,
          image_size: aspectRatio === "4:3" ? { width: 1024, height: 768 } : { width: 1024, height: 1536 },
        },
      };
    }
    return {
      ...profile,
      params: { ...profile.params, aspect_ratio: aspectRatio },
    };
  };
  const profiles = {
    image_source_cleanup: withAspectRatio(baseProfiles.image_source_cleanup),
    image_hero_shot: withAspectRatio(baseProfiles.image_hero_shot),
    image_macro_shot: withAspectRatio(baseProfiles.image_macro_shot),
  };
  const job = await prisma.vvsStudioJob.create({
    data: {
      id: crypto.randomUUID(),
      accountId,
      shootId: shoot.id,
      kind: "image_post_pipeline",
      status: "queued",
      currentStage: "image_source_cleanup",
      profileSelectionJson: safeJson({
        profiles: {
          image_source_cleanup: profileSnapshot(profiles.image_source_cleanup),
          image_hero_shot: profileSnapshot(profiles.image_hero_shot),
          image_macro_shot: profileSnapshot(profiles.image_macro_shot),
        },
        style: { key: style.key, backgroundAsset: style.backgroundAsset, placementPrompt: style.placementPrompt },
      }),
    },
  });

  await prisma.vvsStudioShoot.update({
    where: { id: shoot.id },
    data: { status: "generating_image", error: null, completedAt: null, updatedAt: new Date() },
  });
  return job;
}

export async function startVvsVideoPipeline({
  accountId,
  shootId,
}: {
  accountId: string;
  shootId: string;
}) {
  const shoot = await prisma.vvsStudioShoot.findUnique({
    where: { id: shootId },
    include: { Uploads: true },
  });
  if (!shoot || shoot.accountId !== accountId) throw new Error("Shoot not found.");
  if (shoot.pieceType && shoot.pieceType !== "pendant") {
    throw new Error("VVS video generation currently supports pendants only.");
  }
  const settings = await getVvsPipelineSettings(accountId);
  if (!shoot.visualStyle || !styleFromSettings(settings, shoot.visualStyle)) {
    throw new Error("Choose a supported VVS video style before generating.");
  }
  if (!shoot.Uploads.some(upload => upload.angle === "top")) {
    throw new Error("Upload a top-view pendant photo before generating.");
  }
  await ensureUsageAvailable(accountId, "vvs_video_generated");

  const activeJob = await prisma.vvsStudioJob.findFirst({
    where: {
      shootId: shoot.id,
      status: { in: ["queued", "running"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (activeJob) return activeJob;

  const profiles = providerProfilesForShoot(settings, shoot.videoDurationSeconds);
  const job = await prisma.vvsStudioJob.create({
    data: {
      id: crypto.randomUUID(),
      accountId,
      shootId: shoot.id,
      kind: "video_pipeline",
      status: "queued",
      currentStage: "source_refine",
      profileSelectionJson: safeJson({
        source_refine: profileSnapshot(profiles.source_refine),
        style_composite: profileSnapshot(profiles.style_composite),
        last_shot: profileSnapshot(profiles.last_shot),
        video: profileSnapshot(profiles.video),
      }),
    },
  });

  await prisma.vvsStudioShoot.update({
    where: { id: shoot.id },
    data: { status: "generating_image", error: null, updatedAt: new Date() },
  });

  return job;
}

export async function retryVvsStudioJob({
  accountId,
  jobId,
}: {
  accountId: string;
  jobId: string;
}) {
  const job = await prisma.vvsStudioJob.findUnique({ where: { id: jobId } });
  if (!job || job.accountId !== accountId) throw new Error("Job not found.");
  if (job.status !== "failed") throw new Error("Only failed VVS jobs can be retried.");

  return prisma.vvsStudioJob.update({
    where: { id: job.id },
    data: {
      status: "queued",
      attempts: 0,
      lockedAt: null,
      lockedBy: null,
      runAfter: new Date(),
      error: null,
      updatedAt: new Date(),
    },
  });
}

function profileSnapshot(profile: VvsGenerationProfile) {
  return {
    id: profile.id,
    version: profile.version,
    stage: profile.stage,
    provider: profile.provider,
    modelId: profile.modelId,
    params: profile.params,
    promptTemplate: profile.promptTemplate,
    active: profile.active,
    trafficWeight: profile.trafficWeight,
  };
}

async function claimNextJob(workerId: string) {
  const staleBefore = new Date(Date.now() - JOB_LOCK_TTL_MS);
  const job = await prisma.vvsStudioJob.findFirst({
    where: {
      status: "queued",
      runAfter: { lte: new Date() },
      OR: [{ lockedAt: null }, { lockedAt: { lt: staleBefore } }],
    },
    orderBy: [{ runAfter: "asc" }, { createdAt: "asc" }],
  });
  if (!job) return null;

  const claimed = await prisma.vvsStudioJob.updateMany({
    where: {
      id: job.id,
      status: "queued",
      runAfter: { lte: new Date() },
      OR: [{ lockedAt: null }, { lockedAt: { lt: staleBefore } }],
    },
    data: {
      status: "running",
      lockedAt: new Date(),
      lockedBy: workerId,
      error: null,
      updatedAt: new Date(),
    },
  });
  if (claimed.count !== 1) return null;
  return prisma.vvsStudioJob.findUnique({ where: { id: job.id } });
}

async function releaseJob(jobId: string, stage: JobStage, delayMs = JOB_POLL_DELAY_MS) {
  await prisma.vvsStudioJob.update({
    where: { id: jobId },
    data: {
      status: "queued",
      currentStage: stage,
      lockedAt: null,
      lockedBy: null,
      runAfter: nowPlus(delayMs),
      updatedAt: new Date(),
    },
  });
}

async function failJob(job: { id: string; shootId: string; attempts: number; maxAttempts: number }, message: string) {
  const attempts = job.attempts + 1;
  if (attempts < job.maxAttempts) {
    await prisma.vvsStudioJob.update({
      where: { id: job.id },
      data: {
        status: "queued",
        attempts,
        error: message,
        lockedAt: null,
        lockedBy: null,
        runAfter: nowPlus(30_000 * attempts),
        updatedAt: new Date(),
      },
    });
    return;
  }

  const completedAt = new Date();
  await prisma.$transaction([
    prisma.vvsStudioJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        attempts,
        error: message,
        lockedAt: null,
        lockedBy: null,
        completedAt,
        updatedAt: completedAt,
      },
    }),
    prisma.vvsStudioShoot.update({
      where: { id: job.shootId },
      data: { status: "failed", error: message, updatedAt: completedAt },
    }),
  ]);
}

async function completeJob(jobId: string, shootId: string) {
  const completedAt = new Date();
  await prisma.$transaction([
    prisma.vvsStudioJob.update({
      where: { id: jobId },
      data: {
        status: "succeeded",
        currentStage: "complete",
        lockedAt: null,
        lockedBy: null,
        completedAt,
        error: null,
        updatedAt: completedAt,
      },
    }),
    prisma.vvsStudioShoot.update({
      where: { id: shootId },
      data: { status: "video_succeeded", completedAt, error: null, updatedAt: completedAt },
    }),
  ]);
}

async function completeImagePostJob(jobId: string, shootId: string) {
  const completedAt = new Date();
  await prisma.$transaction([
    prisma.vvsStudioJob.update({
      where: { id: jobId },
      data: { status: "succeeded", currentStage: "complete", lockedAt: null, lockedBy: null, completedAt, error: null, updatedAt: completedAt },
    }),
    prisma.vvsStudioShoot.update({
      where: { id: shootId },
      data: { status: "image_succeeded", completedAt, error: null, updatedAt: completedAt },
    }),
  ]);
}

async function ensureProviderUrlFromUpload(upload: {
  id: string;
  accountId: string;
  shootId: string;
  angle: string;
  storageKey: string;
  imageUrl: string;
  normalizedContentType: string;
}) {
  if (!upload.imageUrl.startsWith("r2://")) {
    const url = publicStoredImageUrl(null, upload.imageUrl);
    assertPublicImageUrl(url);
    return url;
  }

  if (!isR2Configured()) throw new Error("R2 must be configured to prepare private VVS source uploads for generation.");
  const attachment = await readVvsSourceAttachment(upload);
  const key = `${PROVIDER_INPUT_PREFIX}/${upload.accountId}/${upload.shootId}-${upload.angle}-${upload.id}.jpg`;
  return uploadToR2({
    key,
    body: attachment.buffer,
    contentType: attachment.mimeType,
    cacheControl: "public, max-age=3600",
  });
}

async function imageUrlToAttachment(imageUrl: string, index: number) {
  try {
    const parsed = new URL(imageUrl);
    const publicPath = path.join(process.cwd(), "public", decodeURIComponent(parsed.pathname));
    const publicRoot = path.join(process.cwd(), "public");
    if (publicPath.startsWith(`${publicRoot}${path.sep}`)) {
      const buffer = await fs.readFile(publicPath);
      const ext = path.extname(publicPath).toLowerCase();
      const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      return {
        buffer,
        mimeType,
        fileName: path.basename(publicPath),
      };
    }
  } catch {
    // Fall back to fetching remote URLs below.
  }

  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Unable to read provider image input ${index + 1}. HTTP ${response.status}.`);
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) throw new Error(`Provider image input ${index + 1} is not an image.`);
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    mimeType: contentType,
    fileName: `vvs-input-${index + 1}.${ext}`,
  };
}

async function runGeminiImageStage({
  gen,
  profile,
  prompt,
  imageUrls,
  nextStage,
  jobId,
}: {
  gen: { id: string };
  profile: VvsGenerationProfile;
  prompt: string;
  imageUrls: string[];
  nextStage: JobStage;
  jobId: string;
}) {
  const attachments = await Promise.all(imageUrls.map((imageUrl, index) => imageUrlToAttachment(imageUrl, index)));
  const result = await generateVvsImage({
    provider: "gemini",
    modelId: profile.modelId,
    prompt,
    attachments,
    generationId: gen.id,
  });
  await markImageSucceeded(gen.id, result.imageUrl, { provider: "gemini", modelId: result.modelId }, nextStage === "video" ? "image_finalized" : "generating_image");
  await releaseJob(jobId, nextStage, 0);
}

async function runFalImageStage({
  gen,
  profile,
  prompt,
  imageUrls,
  nextStage,
  jobId,
}: {
  gen: { id: string; providerJobId: string | null };
  profile: VvsGenerationProfile;
  prompt: string;
  imageUrls: string[];
  nextStage: JobStage;
  jobId: string;
}) {
  let providerJobId = gen.providerJobId;
  if (!providerJobId) {
    const submitted = await submitFalImageEdit({ profile, prompt, imageUrls });
    providerJobId = submitted.providerJobId;
    await prisma.vvsStudioImageGeneration.update({
      where: { id: gen.id },
      data: {
        providerJobId,
        modelId: submitted.modelId,
        providerPayloadJson: safeJson(submitted.payload),
      },
    });
  }

  const polled = await pollFalImageEdit({ profile, providerJobId });
  await prisma.vvsStudioImageGeneration.update({
    where: { id: gen.id },
    data: { providerPayloadJson: safeJson(polled.payload) },
  });

  if (polled.status === "failed") throw new Error(polled.error ?? "fal image edit failed.");
  if (polled.status === "pending") {
    await releaseJob(jobId, profile.stage);
    return;
  }
  if (!polled.outputUrl) throw new Error(`${profile.stage} completed but did not return an output image.`);

  const imageUrl = await saveRemoteVvsImage(polled.outputUrl, gen.id);
  await markImageSucceeded(gen.id, imageUrl, polled.payload, nextStage === "video" ? "image_finalized" : "generating_image");
  await releaseJob(jobId, nextStage, 0);
}

async function ensurePendingImageGeneration({
  jobId,
  accountId,
  shootId,
  stage,
  variant,
  prompt,
  profile,
  styleKey,
  sourceImageGenerationId,
  outputRole,
  inputManifest,
  retentionExpiresAt,
}: {
  jobId: string;
  accountId: string;
  shootId: string;
  stage: VvsPipelineStage;
  variant: number;
  prompt: string;
  profile: VvsGenerationProfile;
  styleKey?: string;
  sourceImageGenerationId?: string;
  outputRole?: string;
  inputManifest?: unknown;
  retentionExpiresAt?: Date;
}) {
  const existing = await prisma.vvsStudioImageGeneration.findFirst({
    where: { jobId, stage, status: { in: ["pending", "succeeded"] } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  return prisma.vvsStudioImageGeneration.create({
    data: {
      id: crypto.randomUUID(),
      accountId,
      shootId,
      jobId,
      variant,
      stage,
      sourceImageGenerationId,
      outputRole,
      inputManifestJson: safeJson(inputManifest),
      retentionExpiresAt,
      styleKey,
      status: "pending",
      prompt,
      promptVersion: profile.version,
      providerProfileId: profile.id,
      providerProfileVersion: profile.version,
      provider: profile.provider,
      modelId: profile.modelId,
      startedAt: new Date(),
    },
  });
}

async function runImageStage({
  jobId,
  accountId,
  shootId,
  stage,
  profile,
  prompt,
  imageUrls,
  variant,
  styleKey,
  sourceImageGenerationId,
  outputRole,
  inputManifest,
  retentionExpiresAt,
  nextStage,
}: {
  jobId: string;
  accountId: string;
  shootId: string;
  stage: VvsPipelineStage;
  profile: VvsGenerationProfile;
  prompt: string;
  imageUrls: string[];
  variant: number;
  styleKey?: string;
  sourceImageGenerationId?: string;
  outputRole?: string;
  inputManifest?: unknown;
  retentionExpiresAt?: Date;
  nextStage: JobStage;
}) {
  const gen = await ensurePendingImageGeneration({
    jobId,
    accountId,
    shootId,
    stage,
    variant,
    prompt,
    profile,
    styleKey,
    sourceImageGenerationId,
    outputRole,
    inputManifest,
    retentionExpiresAt,
  });

  if (gen.status === "succeeded" && gen.imageUrl) {
    if (gen.outputRole === "shot_1" && gen.jobId) {
      await consumeUsageCredit({
        accountId: gen.accountId,
        kind: "vvs_product_post_generated",
        sourceType: "VvsStudioJob",
        sourceId: gen.jobId,
        metadata: { shootId: gen.shootId, stage: gen.stage },
      });
    }
    await releaseJob(jobId, nextStage, 0);
    return;
  }

  if (profile.provider === "gemini") {
    await runGeminiImageStage({ gen, profile, prompt, imageUrls, nextStage, jobId });
    return;
  }

  if (profile.provider === "fal") {
    await runFalImageStage({ gen, profile, prompt, imageUrls, nextStage, jobId });
    return;
  }

  if (!gen.providerJobId) {
    const submitted = await submitImageEdit({ profile, prompt, imageUrls });
    await prisma.vvsStudioImageGeneration.update({
      where: { id: gen.id },
      data: {
        providerJobId: submitted.providerJobId,
        modelId: submitted.modelId,
        providerPayloadJson: safeJson(submitted.payload),
      },
    });

    if (submitted.status === "completed" && submitted.immediateOutputUrl) {
      const imageUrl = await saveRemoteVvsImage(submitted.immediateOutputUrl, gen.id);
      await markImageSucceeded(gen.id, imageUrl, submitted.payload, nextStage === "video" ? "image_finalized" : "generating_image");
      await releaseJob(jobId, nextStage, 0);
      return;
    }

    await releaseJob(jobId, stage);
    return;
  }

  const polled = await pollWavespeedJob(gen.providerJobId);
  await prisma.vvsStudioImageGeneration.update({
    where: { id: gen.id },
    data: { providerPayloadJson: safeJson(polled.payload) },
  });

  if (polled.status === "failed") throw new Error(polled.error ?? `${stage} failed at Wavespeed.`);
  if (polled.status === "pending") {
    await releaseJob(jobId, stage);
    return;
  }
  if (!polled.outputUrl) throw new Error(`${stage} completed but did not return an output image.`);

  const imageUrl = await saveRemoteVvsImage(polled.outputUrl, gen.id);
  await markImageSucceeded(gen.id, imageUrl, polled.payload, nextStage === "video" ? "image_finalized" : "generating_image");
  await releaseJob(jobId, nextStage, 0);
}

async function markImageSucceeded(imageGenerationId: string, imageUrl: string, payload: unknown, shootStatus: string) {
  const completedAt = new Date();
  const existing = await prisma.vvsStudioImageGeneration.findUnique({ where: { id: imageGenerationId }, select: { startedAt: true } });
  const gen = await prisma.vvsStudioImageGeneration.update({
    where: { id: imageGenerationId },
    data: {
      status: "succeeded",
      imageUrl,
      providerPayloadJson: safeJson(payload),
      completedAt,
      durationMs: existing?.startedAt ? Math.max(0, completedAt.getTime() - existing.startedAt.getTime()) : null,
      error: null,
    },
  });
  await prisma.vvsStudioShoot.update({
    where: { id: gen.shootId },
    data: { status: shootStatus, error: null, updatedAt: completedAt },
  });
  if (gen.stage === "style_composite" || gen.outputRole === "shot_1") {
    await consumeUsageCredit({
      accountId: gen.accountId,
      kind: "vvs_product_post_generated",
      sourceType: gen.outputRole === "shot_1" ? "VvsStudioJob" : "VvsStudioImageGeneration",
      sourceId: gen.outputRole === "shot_1" && gen.jobId ? gen.jobId : gen.id,
      metadata: { shootId: gen.shootId, stage: gen.stage }
    });
  }
}

async function runVideoStage({
  jobId,
  accountId,
  shootId,
  styleKey,
  durationSeconds,
  firstImage,
  lastImage,
}: {
  jobId: string;
  accountId: string;
  shootId: string;
  styleKey: string;
  durationSeconds: number;
  firstImage: { id: string; imageUrl: string };
  lastImage: { id: string; imageUrl: string };
}) {
  const settings = await getVvsPipelineSettings(accountId);
  const profile = durationSeconds === 10 ? settings.profiles.video_10s : settings.profiles.video_6s;
  const prompt = renderPrompt(profile);
  const firstImageUrl = publicStoredImageUrl(null, firstImage.imageUrl);
  const lastImageUrl = publicStoredImageUrl(null, lastImage.imageUrl);
  assertPublicImageUrl(firstImageUrl);
  assertPublicImageUrl(lastImageUrl);

  const existing = await prisma.vvsStudioVideoGeneration.findFirst({
    where: { shootId, firstImageGenerationId: firstImage.id, lastImageGenerationId: lastImage.id },
    orderBy: { createdAt: "desc" },
  });
  const videoGen = existing ?? await prisma.vvsStudioVideoGeneration.create({
    data: {
      id: crypto.randomUUID(),
      accountId,
      shootId,
      sourceImageGenerationId: firstImage.id,
      firstImageGenerationId: firstImage.id,
      lastImageGenerationId: lastImage.id,
      sourceImageUrl: firstImage.imageUrl,
      lastImageUrl: lastImage.imageUrl,
      styleKey,
      status: "pending",
      prompt,
      promptVersion: profile.version,
      providerProfileId: profile.id,
      providerProfileVersion: profile.version,
      provider: "wavespeed",
      modelId: profile.modelId,
      videoDurationSeconds: durationSeconds,
      resolution: String(profile.params.resolution ?? "480p"),
      startedAt: new Date(),
    },
  });

  await prisma.vvsStudioShoot.update({
    where: { id: shootId },
    data: { status: "generating_video", error: null, updatedAt: new Date() },
  });

  if (videoGen.status === "succeeded" && videoGen.videoUrl) {
    await completeJob(jobId, shootId);
    return;
  }

  if (!videoGen.providerJobId) {
    const submitted = await submitImageToVideo({ profile, prompt, firstImageUrl, lastImageUrl });
    await prisma.vvsStudioVideoGeneration.update({
      where: { id: videoGen.id },
      data: {
        providerJobId: submitted.providerJobId,
        modelId: submitted.modelId,
        providerPayloadJson: safeJson(submitted.payload),
      },
    });

    if (submitted.status === "completed" && submitted.immediateOutputUrl) {
      const videoUrl = await saveRemoteVvsVideo(submitted.immediateOutputUrl, videoGen.id);
      await markVideoSucceeded(videoGen.id, videoUrl, submitted.immediateOutputUrl, submitted.payload);
      await completeJob(jobId, shootId);
      return;
    }

    await releaseJob(jobId, "video");
    return;
  }

  const polled = await pollWavespeedJob(videoGen.providerJobId);
  await prisma.vvsStudioVideoGeneration.update({
    where: { id: videoGen.id },
    data: { providerPayloadJson: safeJson(polled.payload) },
  });

  if (polled.status === "failed") throw new Error(polled.error ?? "Video generation failed at Wavespeed.");
  if (polled.status === "pending") {
    await releaseJob(jobId, "video");
    return;
  }
  if (!polled.outputUrl) throw new Error("Video generation completed but did not return a video URL.");

  const videoUrl = await saveRemoteVvsVideo(polled.outputUrl, videoGen.id);
  await markVideoSucceeded(videoGen.id, videoUrl, polled.outputUrl, polled.payload);
  await completeJob(jobId, shootId);
}

async function markVideoSucceeded(videoGenerationId: string, videoUrl: string, remoteVideoUrl: string, payload: unknown) {
  const completedAt = new Date();
  const videoGen = await prisma.vvsStudioVideoGeneration.update({
    where: { id: videoGenerationId },
    data: {
      status: "succeeded",
      videoUrl,
      remoteVideoUrl,
      providerPayloadJson: safeJson(payload),
      completedAt,
      error: null,
    },
  });
  await prisma.vvsStudioShoot.update({
    where: { id: videoGen.shootId },
    data: { status: "video_succeeded", completedAt, error: null, updatedAt: completedAt },
  });
  await consumeUsageCredit({
    accountId: videoGen.accountId,
    kind: "vvs_video_generated",
    sourceType: "VvsStudioVideoGeneration",
    sourceId: videoGen.id,
    metadata: { shootId: videoGen.shootId }
  });
}

async function processImagePostJob(
  job: NonNullable<Awaited<ReturnType<typeof claimNextJob>>>,
  shoot: Awaited<ReturnType<typeof prisma.vvsStudioShoot.findUnique>> & { Uploads: Array<{
    id: string;
    accountId: string;
    shootId: string;
    angle: string;
    storageKey: string;
    imageUrl: string;
    normalizedContentType: string;
  }> },
  settings: Awaited<ReturnType<typeof getVvsPipelineSettings>>,
  style: NonNullable<ReturnType<typeof styleFromSettings>>,
) {
  const liveProfiles = imagePostProfiles(settings);
  const selection = imagePostSelectionFromJob(job, {
    profiles: liveProfiles,
    style: { key: style.key, backgroundAsset: style.backgroundAsset, placementPrompt: style.placementPrompt },
  });
  const stage = job.currentStage as JobStage;

  if (stage === "image_source_cleanup") {
    const topUpload = shoot.Uploads.find(upload => upload.angle === "top");
    if (!topUpload) throw new Error("Top-view pendant upload is required.");
    const sourceUrl = await ensureProviderUrlFromUpload(topUpload);
    const profile = selection.profiles.image_source_cleanup;
    await runImageStage({
      jobId: job.id,
      accountId: job.accountId,
      shootId: shoot.id,
      stage: "image_source_cleanup",
      profile,
      prompt: renderPrompt(profile),
      imageUrls: [sourceUrl],
      variant: 0,
      outputRole: "hidden_intermediate",
      inputManifest: [{ type: "upload", uploadId: topUpload.id, angle: "top", url: sourceUrl }],
      retentionExpiresAt: nowPlus(90 * 24 * 60 * 60_000),
      nextStage: "image_hero_shot",
    });
    return;
  }

  const cleanup = await prisma.vvsStudioImageGeneration.findFirst({
    where: { jobId: job.id, stage: "image_source_cleanup", status: "succeeded", imageUrl: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!cleanup?.imageUrl) throw new Error("Source cleanup is not ready.");

  if (stage === "image_hero_shot") {
    const cleanedUrl = publicStoredImageUrl(null, cleanup.imageUrl);
    const backgroundUrl = publicAssetUrl(selection.style.backgroundAsset);
    assertPublicImageUrl(cleanedUrl);
    assertPublicImageUrl(backgroundUrl);
    const profile = selection.profiles.image_hero_shot;
    const snapshotStyle = {
      ...style,
      backgroundAsset: selection.style.backgroundAsset,
      placementPrompt: selection.style.placementPrompt,
    };
    await runImageStage({
      jobId: job.id,
      accountId: job.accountId,
      shootId: shoot.id,
      stage: "image_hero_shot",
      profile,
      prompt: renderPrompt(profile, snapshotStyle),
      imageUrls: [cleanedUrl, backgroundUrl],
      variant: 1,
      styleKey: selection.style.key,
      sourceImageGenerationId: cleanup.id,
      outputRole: "shot_1",
      inputManifest: [
        { type: "generation", generationId: cleanup.id, role: "cleaned_product", url: cleanedUrl },
        { type: "style_background", styleKey: selection.style.key, url: backgroundUrl },
      ],
      nextStage: "complete",
    });
    return;
  }

  const hero = await prisma.vvsStudioImageGeneration.findFirst({
    where: { jobId: job.id, stage: "image_hero_shot", status: "succeeded", imageUrl: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!hero?.imageUrl) throw new Error("First post shot is not ready.");

  if (stage === "image_macro_shot") {
    const heroUrl = publicStoredImageUrl(null, hero.imageUrl);
    assertPublicImageUrl(heroUrl);
    const profile = selection.profiles.image_macro_shot;
    await runImageStage({
      jobId: job.id,
      accountId: job.accountId,
      shootId: shoot.id,
      stage: "image_macro_shot",
      profile,
      prompt: renderPrompt(profile),
      imageUrls: [heroUrl],
      variant: 2,
      styleKey: selection.style.key,
      sourceImageGenerationId: hero.id,
      outputRole: "shot_2",
      inputManifest: [{ type: "generation", generationId: hero.id, role: "shot_1", url: heroUrl }],
      nextStage: "complete",
    });
    return;
  }

  await completeImagePostJob(job.id, shoot.id);
}

async function processClaimedJob(job: NonNullable<Awaited<ReturnType<typeof claimNextJob>>>) {
  const shoot = await prisma.vvsStudioShoot.findUnique({
    where: { id: job.shootId },
    include: { Uploads: true },
  });
  if (!shoot || shoot.accountId !== job.accountId) throw new Error("Shoot not found for VVS job.");
  const settings = await getVvsPipelineSettings(job.accountId);
  const style = styleFromSettings(settings, shoot.visualStyle);
  if (!style) throw new Error("Unsupported VVS style.");
  if (shoot.pieceType && shoot.pieceType !== "pendant") throw new Error("VVS Studio generation currently supports pendants only.");

  if (job.kind === "image_post_pipeline") {
    await processImagePostJob(job, shoot, settings, style);
    return;
  }

  const profiles = providerProfilesForShoot(settings, shoot.videoDurationSeconds);
  const stage = job.currentStage as JobStage;
  const durationSeconds = shoot.videoDurationSeconds === 10 ? 10 : 6;

  if (stage === "source_refine") {
    const topUpload = shoot.Uploads.find(upload => upload.angle === "top");
    if (!topUpload) throw new Error("Top-view pendant upload is required.");
    const sourceUrl = await ensureProviderUrlFromUpload(topUpload);
    await runImageStage({
      jobId: job.id,
      accountId: job.accountId,
      shootId: shoot.id,
      stage: "source_refine",
      profile: profiles.source_refine,
      prompt: renderPrompt(profiles.source_refine),
      imageUrls: [sourceUrl],
      variant: 1,
      nextStage: "style_composite",
    });
    return;
  }

  const sourceRefine = await prisma.vvsStudioImageGeneration.findFirst({
    where: { shootId: shoot.id, stage: "source_refine", status: "succeeded", imageUrl: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!sourceRefine?.imageUrl) throw new Error("Source refinement is not ready.");

  if (stage === "style_composite") {
    const refinedUrl = publicStoredImageUrl(null, sourceRefine.imageUrl);
    const backgroundUrl = publicAssetUrl(style.backgroundAsset);
    assertPublicImageUrl(refinedUrl);
    assertPublicImageUrl(backgroundUrl);
    await runImageStage({
      jobId: job.id,
      accountId: job.accountId,
      shootId: shoot.id,
      stage: "style_composite",
      profile: profiles.style_composite,
      prompt: renderPrompt(profiles.style_composite, style),
      imageUrls: [refinedUrl, backgroundUrl],
      variant: 2,
      styleKey: style.key,
      sourceImageGenerationId: sourceRefine.id,
      nextStage: "last_shot",
    });
    return;
  }

  const styledImage = await prisma.vvsStudioImageGeneration.findFirst({
    where: { shootId: shoot.id, stage: "style_composite", status: "succeeded", imageUrl: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!styledImage?.imageUrl) throw new Error("Styled pendant image is not ready.");

  if (stage === "last_shot") {
    const styledUrl = publicStoredImageUrl(null, styledImage.imageUrl);
    assertPublicImageUrl(styledUrl);
    await runImageStage({
      jobId: job.id,
      accountId: job.accountId,
      shootId: shoot.id,
      stage: "last_shot",
      profile: profiles.last_shot,
      prompt: renderPrompt(profiles.last_shot),
      imageUrls: [styledUrl],
      variant: 3,
      styleKey: style.key,
      sourceImageGenerationId: styledImage.id,
      nextStage: "video",
    });
    return;
  }

  const lastShot = await prisma.vvsStudioImageGeneration.findFirst({
    where: { shootId: shoot.id, stage: "last_shot", status: "succeeded", imageUrl: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!lastShot?.imageUrl) throw new Error("Final video frame is not ready.");

  if (stage === "video") {
    await runVideoStage({
      jobId: job.id,
      accountId: job.accountId,
      shootId: shoot.id,
      styleKey: style.key,
      durationSeconds,
      firstImage: { id: styledImage.id, imageUrl: styledImage.imageUrl },
      lastImage: { id: lastShot.id, imageUrl: lastShot.imageUrl },
    });
    return;
  }

  await completeJob(job.id, shoot.id);
}

export async function processNextVvsStudioJob() {
  const workerId = crypto.randomUUID();
  const job = await claimNextJob(workerId);
  if (!job) return { processed: false };

  try {
    await processClaimedJob(job);
    return { processed: true, jobId: job.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "VVS video job failed.";
    const completedAt = new Date();
    await prisma.vvsStudioImageGeneration.updateMany({
      where: { jobId: job.id, stage: job.currentStage, status: "pending" },
      data: { status: "failed", error: message, completedAt },
    });
    await failJob(job, message);
    return { processed: true, jobId: job.id, error: message };
  }
}

export async function processVvsStudioJobs(limit = 2) {
  const results: Array<Awaited<ReturnType<typeof processNextVvsStudioJob>>> = [];
  for (let i = 0; i < limit; i += 1) {
    const result = await processNextVvsStudioJob();
    results.push(result);
    if (!result.processed) break;
  }
  return results;
}

export async function processVvsStudioJobsUntilIdle(maxDurationMs = 240_000) {
  const deadline = Date.now() + maxDurationMs;
  const results: Array<Awaited<ReturnType<typeof processNextVvsStudioJob>>> = [];

  while (Date.now() < deadline) {
    const result = await processNextVvsStudioJob();
    results.push(result);
    if (result.processed) continue;

    const next = await prisma.vvsStudioJob.findFirst({
      where: { status: "queued" },
      orderBy: { runAfter: "asc" },
      select: { runAfter: true },
    });
    if (!next) break;
    const delay = Math.min(Math.max(next.runAfter.getTime() - Date.now(), 250), 10_000);
    if (Date.now() + delay >= deadline) break;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  await purgeExpiredVvsImageIntermediates();
  return results;
}

export async function purgeExpiredVvsImageIntermediates(limit = 25) {
  const expired = await prisma.vvsStudioImageGeneration.findMany({
    where: {
      outputRole: "hidden_intermediate",
      retentionExpiresAt: { lte: new Date() },
      imageUrl: { not: null },
    },
    orderBy: { retentionExpiresAt: "asc" },
    take: limit,
    select: { id: true, imageUrl: true },
  });

  for (const artifact of expired) {
    if (!artifact.imageUrl) continue;
    await deleteStoredVvsImage(artifact.imageUrl);
    await prisma.vvsStudioImageGeneration.update({
      where: { id: artifact.id },
      data: { imageUrl: null },
    });
  }
  return expired.length;
}
