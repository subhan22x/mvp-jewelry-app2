import { describe, expect, it } from "vitest";
import {
  IMAGE_HERO_SHOT_PROFILE,
  IMAGE_MACRO_SHOT_PROFILE,
  IMAGE_SOURCE_CLEANUP_PROFILE,
  STYLE_COMPOSITE_PROFILE,
  renderPrompt,
  videoProfileForDuration,
} from "../prompt-profiles";

describe("VVS Studio prompt profiles", () => {
  it("selects the 6 second Seedance profile by default", () => {
    const profile = videoProfileForDuration(undefined);
    expect(profile.id).toBe("vvs-video-seedance-1-5-480p");
    expect(profile.params.duration).toBe(6);
    expect(profile.params.resolution).toBe("480p");
  });

  it("selects the 10 second Seedance 2 profile for longer videos", () => {
    const profile = videoProfileForDuration(10);
    expect(profile.id).toBe("vvs-video-seedance-2-0-480p");
    expect(profile.params.duration).toBe(10);
    expect(profile.modelId).toContain("seedance-2.0");
  });

  it("renders style placement prompts into the style composite profile", () => {
    const prompt = renderPrompt(STYLE_COMPOSITE_PROFILE, {
      key: "prisma",
      label: "Prisma",
      active: true,
      sortOrder: 1,
      previewAsset: "/preview.mp4",
      backgroundAsset: "/background.png",
      placementPrompt: "place this pendant on the platform",
    });

    expect(prompt).toBe("place this pendant on the platform");
  });

  it("uses fal GPT Image 2 edit for the first publishable image and Gemini for the rest", () => {
    expect(IMAGE_SOURCE_CLEANUP_PROFILE.stage).toBe("image_source_cleanup");
    expect(IMAGE_SOURCE_CLEANUP_PROFILE.provider).toBe("gemini");
    expect(IMAGE_SOURCE_CLEANUP_PROFILE.modelId).toBe("gemini-3.1-flash-image");
    expect(IMAGE_HERO_SHOT_PROFILE.stage).toBe("image_hero_shot");
    expect(IMAGE_HERO_SHOT_PROFILE.provider).toBe("fal");
    expect(IMAGE_HERO_SHOT_PROFILE.modelId).toBe("openai/gpt-image-2/edit");
    expect(IMAGE_HERO_SHOT_PROFILE.params.quality).toBe("medium");
    expect(IMAGE_HERO_SHOT_PROFILE.params.image_size).toEqual({ width: 1024, height: 1536 });
    expect(IMAGE_MACRO_SHOT_PROFILE.stage).toBe("image_macro_shot");
    expect(IMAGE_MACRO_SHOT_PROFILE.provider).toBe("gemini");
    expect(IMAGE_MACRO_SHOT_PROFILE.modelId).toBe("gemini-3.1-flash-image");
  });

  it("loads image-post prompts from editable templates and renders style direction", () => {
    expect(IMAGE_SOURCE_CLEANUP_PROFILE.promptTemplate).toContain("direct source of truth");
    expect(IMAGE_MACRO_SHOT_PROFILE.promptTemplate).toContain("orbit the camera 50 degrees towards the right");
    expect(renderPrompt(IMAGE_HERO_SHOT_PROFILE, {
      key: "noir",
      label: "Noir",
      active: true,
      sortOrder: 1,
      previewAsset: "/preview.mp4",
      backgroundAsset: "/background.png",
      placementPrompt: "float above the platform",
    })).toContain("float above the platform");
  });
});
