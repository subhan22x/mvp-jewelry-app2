import { describe, expect, it } from "vitest";
import { buildVariants } from "../builder";

const baseInput = {
  userId: "demo",
  text: "Alyssa",
  twoTone: true,
  primaryMetal: "rose_gold" as const,
  secondaryMetal: "white_gold" as const,
  emblem: "butterfly" as const
};

function promptFor(styleId: string) {
  return buildVariants({ ...baseInput, styleId }).map(variant => ({
    variant: variant.variant,
    prompt: JSON.parse(variant.prompt)
  }));
}

function rawPromptsFor(styleId: string) {
  return buildVariants({ ...baseInput, styleId }).map(variant => ({
    variant: variant.variant,
    prompt: variant.prompt
  }));
}

describe("buildVariants", () => {
  it("builds DEJA with CC Matinee Idol and model-specific bubble settings", () => {
    const variants = promptFor("deja");

    expect(variants).toHaveLength(2);
    expect(variants[0]).toMatchObject({
      variant: 1,
      prompt: {
        style_control: { deviation_strength: 0.4 },
        pendant: {
          text: {
            "Primary TEXT": ["Alyssa"],
            font: { preferred_family: "CC Matinee Idol" }
          }
        },
        composition_control: {
          aspect_ratio: "9:16",
          instruction: "Render the final product photo in a vertical 9:16 composition. Keep the full pendant and bail visible with clean margins."
        },
        text_bubble_outline: { enabled: false }
      }
    });
    expect(variants[1]).toMatchObject({
      variant: 2,
      prompt: {
        style_control: { deviation_strength: 0.6 },
        pendant: {
          text: {
            "Primary TEXT": ["Alyssa"],
            font: { preferred_family: "CC Matinee Idol" }
          }
        },
        text_bubble_outline: { enabled: true }
      }
    });
    expect(variants[1].prompt).not.toHaveProperty("composition_control");
  });

  it("builds KING as a forced all-caps prose prompt", () => {
    const variants = rawPromptsFor("king");

    expect(variants).toHaveLength(2);
    for (const variant of variants) {
      expect(variant.prompt).toContain('change the text on this pendant to "ALYSSA"');
      expect(variant.prompt).toContain('Use the font Helvetica Black SLANTED');
      expect(variant.prompt).toContain('Add a butterfly emblem like the one shown in the second picture');
      expect(variant.prompt).toContain('change the color of the entire jewelry pendant to two_tone rose_gold + white_gold');
    }
    expect(variants[0].prompt).toContain("vertical 9:16 composition");
    expect(variants[1].prompt).not.toContain("vertical 9:16 composition");
  });

  it("builds JHON with Carnivalee Freakshow, as-typed text, and no bubble outline", () => {
    const variants = promptFor("jhon");

    expect(variants.map(variant => variant.prompt.style_control.deviation_strength)).toEqual([0.5, 0.7]);
    expect(variants.map(variant => variant.prompt.pendant.text["Primary TEXT"])).toEqual([["Alyssa"], ["Alyssa"]]);
    expect(variants.map(variant => variant.prompt.pendant.text.font.preferred_family)).toEqual([
      "Carnivalee Freakshow",
      "Carnivalee Freakshow"
    ]);
    expect(variants.map(variant => variant.prompt.text_bubble_outline.enabled)).toEqual([false, false]);
  });
});
