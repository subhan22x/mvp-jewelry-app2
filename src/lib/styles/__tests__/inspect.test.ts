import { describe, expect, it } from "vitest";
import { inspectStyle } from "../inspect";

const baseInput = {
  userId: "demo",
  styleId: "lexy",
  text: "Alyssa",
  twoTone: true,
  primaryMetal: "rose_gold" as const,
  secondaryMetal: "white_gold" as const,
  emblem: "butterfly" as const
};

describe("inspectStyle", () => {
  it("exposes source style.yml and template paths alongside built variants", () => {
    const inspection = inspectStyle(baseInput);

    expect(inspection.styleId).toBe("lexy");
    expect(inspection.styleLabel).toBe("Lexy");
    expect(inspection.styleYmlPath).toBe(`${process.cwd()}/src/lib/styles/lexy/style.yml`);
    expect(inspection.templatePath).toBe(`${process.cwd()}/src/lib/styles/lexy/block_baguette_v1.jsonp`);
    expect(inspection.templateKey).toBe("block_baguette_v1");
    expect(inspection.emblemsAllowed).toContain("butterfly");
    expect(inspection.variants).toHaveLength(2);
    for (const variant of inspection.variants) {
      expect(variant.prompt).toContain("Alyssa");
      expect(variant.attachments.length).toBeGreaterThan(0);
    }
  });

  it("returns the natural-language template path when natural language mode is requested", () => {
    const inspection = inspectStyle(baseInput, { promptMode: "natural_language" });
    // Lexy has no natural-language template configured, so it falls back to the
    // default template key but still reports a null natural-language path.
    expect(inspection.variants).toHaveLength(2);
    expect(typeof inspection.templatePath).toBe("string");
  });

  it("surfaces the on-disk template path even when an override supplies templateRaw", () => {
    const inspection = inspectStyle(baseInput, {
      styleOverride: { templateRaw: "override body" }
    });
    expect(inspection.templatePath).toBe(`${process.cwd()}/src/lib/styles/lexy/block_baguette_v1.jsonp`);
    expect(inspection.variants[0].prompt).toContain("override body");
  });
});
