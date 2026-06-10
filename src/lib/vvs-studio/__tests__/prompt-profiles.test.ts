import { describe, expect, it } from "vitest";
import {
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
});
