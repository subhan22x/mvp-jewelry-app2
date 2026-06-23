import fs from "node:fs";
import path from "node:path";
import type { VvsStyleDefinition } from "./styles";

export type VvsPipelineStage =
  | "source_refine"
  | "style_composite"
  | "last_shot"
  | "video"
  | "image_source_cleanup"
  | "image_hero_shot"
  | "image_macro_shot";

export type VvsGenerationProfile = {
  id: string;
  version: string;
  stage: VvsPipelineStage;
  provider: "wavespeed";
  modelId: string;
  params: Record<string, unknown>;
  promptTemplate: string;
  active: boolean;
  trafficWeight: number;
};

export const SOURCE_REFINE_PROFILE: VvsGenerationProfile = {
  id: "vvs-source-refine-gpt-image-2",
  version: "2026-06-05.1",
  stage: "source_refine",
  provider: "wavespeed",
  modelId: "openai/gpt-image-2/edit",
  active: true,
  trafficWeight: 100,
  params: {
    quality: "medium",
    resolution: "1k",
    aspect_ratio: "9:16",
    output_format: "png",
    enable_sync_mode: false,
    enable_base64_output: false,
  },
  promptTemplate: `You are creating a professional product photograph of the pendant attached in the raw image.

Use the uploaded raw image as the direct source of truth for the pendant. Preserve the exact pendant design as closely as possible, including the text, font style, letter shapes, proportions, stone layout, pave pattern, metal color, borders, bail, emblem details, and overall construction. Do not redesign the pendant or change the wording. The goal is to turn the raw photo into a polished, high end studio product image while keeping the piece visually accurate to the original pendant.

Only show the jewelry pendant itself. Do not include a chain, necklace, clasp, or any other jewelry parts unless they are part of the pendant's attached bail structure. Remove and exclude all unwanted surrounding elements from the raw image, including background objects, surfaces, hands, props, reflections, display materials, packaging, and any other non pendant elements. The final image should contain only the pendant on a clean luxury background.

Render the pendant as a clean top down jewelry product photograph, shot from a professional overhead angle with the pendant centered in frame. Keep the full pendant and bail fully visible with clean margins around it. The composition should feel balanced, minimal, and premium.

Correct the common flaws of raw phone photography. Remove blur, noise, dust, fingerprints, harsh glare, messy reflections, uneven lighting, color cast, background distractions, and low quality texture. Improve clarity, sharpness, and material definition while keeping the pendant true to the original design.

The diamonds should look high end and realistic, with crisp detail, clean stone separation, realistic brilliance. The metal should look polished and premium, with clean edges, realistic shine, and strong material definition. Avoid flat, cloudy, or plastic looking stones.

Place the pendant on a black suede background with a soft matte luxury texture. The background should feel dark, elegant, and non distracting.

Render the final image as an ultra realistic, high resolution, sharp macro product photograph with deep contrast, accurate materials, realistic diamond sparkle, and a clean luxury presentation. Keep the final composition in vertical 9:16 unless another aspect ratio is requested.`,
};

export const STYLE_COMPOSITE_PROFILE: VvsGenerationProfile = {
  id: "vvs-style-composite-gpt-image-2",
  version: "2026-06-05.1",
  stage: "style_composite",
  provider: "wavespeed",
  modelId: "openai/gpt-image-2/edit",
  active: true,
  trafficWeight: 100,
  params: SOURCE_REFINE_PROFILE.params,
  promptTemplate: "{{stylePlacementPrompt}}",
};

export const LAST_SHOT_PROFILE: VvsGenerationProfile = {
  id: "vvs-last-shot-gpt-image-2",
  version: "2026-06-05.1",
  stage: "last_shot",
  provider: "wavespeed",
  modelId: "openai/gpt-image-2/edit",
  active: true,
  trafficWeight: 100,
  params: SOURCE_REFINE_PROFILE.params,
  promptTemplate:
    "give me more zoomed in angled shot from a different angle that shows the depth and scale of the pendant, the camera being closer to the pendant makes it look bigger, dont change anything in the scene except the camera position, make the diamonds look like diamonds a bit more and make the jewelry piece readable, add a lighting from the top so the depth of the lettering on the pendants is apparent",
};

function readImagePostPrompt(fileName: string) {
  return fs.readFileSync(path.join(process.cwd(), "src/lib/vvs-studio/image-post-prompts", fileName), "utf8").trim();
}

const IMAGE_POST_PARAMS = {
  quality: "medium",
  resolution: "1k",
  aspect_ratio: "9:16",
  output_format: "png",
  enable_sync_mode: false,
  enable_base64_output: false,
};

export const IMAGE_SOURCE_CLEANUP_PROFILE: VvsGenerationProfile = {
  id: "vvs-image-post-source-cleanup",
  version: "2026-06-21.1",
  stage: "image_source_cleanup",
  provider: "wavespeed",
  modelId: "openai/gpt-image-2/edit",
  active: true,
  trafficWeight: 100,
  params: IMAGE_POST_PARAMS,
  promptTemplate: readImagePostPrompt("source-cleanup.jsonp"),
};

export const IMAGE_HERO_SHOT_PROFILE: VvsGenerationProfile = {
  id: "vvs-image-post-hero-shot",
  version: "2026-06-21.1",
  stage: "image_hero_shot",
  provider: "wavespeed",
  modelId: "nano-banana-2/edit-fast",
  active: true,
  trafficWeight: 100,
  params: IMAGE_POST_PARAMS,
  promptTemplate: readImagePostPrompt("hero-shot.jsonp"),
};

export const IMAGE_MACRO_SHOT_PROFILE: VvsGenerationProfile = {
  id: "vvs-image-post-macro-right",
  version: "2026-06-21.1",
  stage: "image_macro_shot",
  provider: "wavespeed",
  modelId: "openai/gpt-image-2/edit",
  active: true,
  trafficWeight: 100,
  params: IMAGE_POST_PARAMS,
  promptTemplate: readImagePostPrompt("macro-right.jsonp"),
};

const VIDEO_PROMPT = `Cinematic ultra realistic 3d promotional video of the attached Jewelry Pendant.

Camera Movement:

Create fast, smooth, high end product commercial camera movement similar to Apple iPhone style product reveal videos. The camera should move with controlled precision, not shaky or handheld. Use a sequence of dynamic macro tracking shots, smooth push ins, fast gliding pans, close orbit shots, and lock on arc shots around the pendant.

The camera should accelerate and decelerate smoothly with cinematic easing. It should sometimes rush close to the pendant, then slow down into a clean macro detail shot. Use shallow depth of field during closeups, with crisp focus locking onto the diamonds, metal edges, bail, and engraved details.

Include dramatic angle changes: low angle hero shots, close side passes across the diamond surface, overhead reveal shots, and smooth circular orbit shots around the pendant. The camera should feel like it is moving through a polished 3D product showcase, with elegant speed ramps and seamless transitions between shots.

Use premium cinematic studio lighting with moving key lights. The key light should orbit around the pendant in sync with the camera, creating sweeping highlights, rim light, moving reflections, and natural diamond sparkle. Use a strong back light from the top far right for edge separation and glowing reflections, with a softer front fill to keep detail visible. Lighting should feel choreographed, not static, and create realistic sparkle, prismatic flashes, and polished luxury reflections without harsh glare.

The back of the jewelry pendant is blank colored metal with no stones.

The piece is heavily encrusted with VVS diamonds and shine naturally under studio lighting.

Style: Hyper-realistic, 8k resolution, elegant, prestigious atmosphere, extremely detailed textures, 60fps.`;

export const VIDEO_PROFILE_6S: VvsGenerationProfile = {
  id: "vvs-video-seedance-1-5-480p",
  version: "2026-06-05.1",
  stage: "video",
  provider: "wavespeed",
  modelId: "bytedance/seedance-v1-5-pro/image-to-video",
  active: true,
  trafficWeight: 100,
  params: { duration: 6, resolution: "480p", aspect_ratio: "9:16", generate_audio: true, enable_web_search: true },
  promptTemplate: VIDEO_PROMPT,
};

export const VIDEO_PROFILE_10S: VvsGenerationProfile = {
  ...VIDEO_PROFILE_6S,
  id: "vvs-video-seedance-2-0-480p",
  modelId: "bytedance/seedance-2.0-fast/image-to-video",
  params: { duration: 10, resolution: "480p", aspect_ratio: "9:16", generate_audio: true, enable_web_search: true },
};

export function renderPrompt(profile: VvsGenerationProfile, style?: VvsStyleDefinition | null) {
  return profile.promptTemplate.replace("{{stylePlacementPrompt}}", style?.placementPrompt ?? "");
}

export function videoProfileForDuration(durationSeconds: number | null | undefined) {
  return durationSeconds === 10 ? VIDEO_PROFILE_10S : VIDEO_PROFILE_6S;
}
