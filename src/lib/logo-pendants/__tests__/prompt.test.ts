import { describe, expect, it } from "vitest";
import { buildLogoPendantPrompt, LogoSettingsSchema } from "../prompt";
import { LOGO_SHAPES } from "../config";

describe("logo pendant prompt", () => {
  it("omits all shape wording for Custom and mentions no unattached example", () => {
    const prompt = buildLogoPendantPrompt({ shape: "custom", colorCombo: "WHITE" });
    expect(prompt).toContain("You are creating a realistic custom diamond jewelry pendant based on the uploaded logo.");
    expect(prompt).not.toMatch(/selected .*shape|pendant shape|example|reference|\{\{/i);
    expect(prompt).toContain("white gold metal color scheme");
    expect(prompt).toContain("vertical 9:16 composition");
  });

  it.each(LOGO_SHAPES.slice(1))("inserts the selected %s shape", shape => {
    const wording = { circle: "round", shield: "shield", hexa: "hexagonal", diamond: "diamond" };
    const prompt = buildLogoPendantPrompt({ shape, colorCombo: "YELLOW_WHITE" });
    expect(prompt).toContain(`follow the selected ${wording[shape as keyof typeof wording]} shape`);
    expect(prompt).toContain("yellow gold and white gold metal color scheme");
    expect(prompt).not.toContain("example attached");
  });

  it("keeps stones fixed while preserving other customer settings as metadata", () => {
    const input = LogoSettingsSchema.parse({ shape: "shield", colorCombo: "ROSE_WHITE", size: "large", stoneType: "cz", diamondQuality: "vs", metalType: "silver" });
    const prompt = buildLogoPendantPrompt(input);
    expect(prompt).toContain("rose gold and white gold metal color scheme");
    expect(prompt).toContain("VVS natural diamonds and micro pavé diamonds");
    expect(prompt).not.toMatch(/CZ|silver|\bVS natural/);
    expect(input.stoneType).toBe("cz");
  });

  it.each([undefined, "", "  ", "\n"])("omits empty About logo context", additionalText => {
    expect(buildLogoPendantPrompt({ shape: "shield", colorCombo: "WHITE", additionalText })).not.toContain("About logo:");
  });

  it("preserves brand context and does not render customer text as template syntax", () => {
    const text = "Grow\n{{METAL_COLOR}}";
    expect(buildLogoPendantPrompt({ shape: "custom", colorCombo: "WHITE", additionalText: text })).toContain(`About logo: ${text}`);
  });
});
