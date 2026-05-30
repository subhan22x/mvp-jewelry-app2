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

function naturalPromptsFor(styleId: string) {
  return buildVariants({ ...baseInput, styleId }, { promptMode: "natural_language" }).map(variant => ({
    variant: variant.variant,
    prompt: variant.prompt
  }));
}

describe("buildVariants", () => {
  it("builds DEJA with CC Matinee Idol and model-specific bubble settings", () => {
    const variants = buildVariants({ ...baseInput, styleId: "deja" }).map(variant => ({
      variant: variant.variant,
      prompt: JSON.parse(variant.prompt),
      attachments: variant.attachments
    }));

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
    expect(variants[0].attachments).toContain(`${process.cwd()}/public/pendants/mojo-deja.png`);
  });

  it("builds KING as a forced all-caps prose prompt", () => {
    const variants = buildVariants({ ...baseInput, styleId: "king" }).map(variant => ({
      variant: variant.variant,
      prompt: variant.prompt,
      attachments: variant.attachments
    }));

    expect(variants).toHaveLength(2);
    for (const variant of variants) {
      expect(variant.prompt).toContain('change the text on this pendant to "ALYSSA"');
      expect(variant.prompt).toContain('Use the font Helvetica Black SLANTED');
      expect(variant.prompt).toContain('Add a butterfly emblem like the one shown in the second picture');
      expect(variant.prompt).toContain('change the color of the entire jewelry pendant to two_tone rose_gold + white_gold');
      expect(variant.attachments).toContain(`${process.cwd()}/public/pendants/mana-king.png`);
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

  it("builds GATTI with the natural-language template and injected snippets", () => {
    const variants = buildVariants({ ...baseInput, styleId: "gatti" }, { promptMode: "natural_language" });

    expect(variants).toHaveLength(2);
    for (const variant of variants) {
      expect(variant.prompt).toContain('changing the main text to "Alyssa"');
      expect(variant.prompt).toContain("Add a butterfly emblem above the lettering");
      expect(variant.prompt).toContain("Use a two tone Rose Gold and White Gold color scheme");
      expect(variant.prompt).toContain("Use a vertical 9:16 composition");
      expect(variant.attachments).toContain(`${process.cwd()}/public/pendants/hasan-gatti.png`);
      expect(() => JSON.parse(variant.prompt)).toThrow();
    }
  });

  it("builds JAIDA with the natural-language template and injected snippets", () => {
    const variants = buildVariants({
      ...baseInput,
      styleId: "jaida",
      text: "Xavier",
      primaryMetal: "yellow_gold",
      secondaryMetal: "white_gold",
      emblem: "moneybag"
    }, { promptMode: "natural_language" });

    expect(variants).toHaveLength(2);
    for (const variant of variants) {
      expect(variant.prompt).toContain('new custom text "Xavier"');
      expect(variant.prompt).toContain("Use the font Great Vibes");
      expect(variant.prompt).toContain("Add a moneybag emblem above the lettering");
      expect(variant.prompt).toContain("Use a two tone Yellow Gold and White Gold color scheme");
      expect(variant.prompt).toContain("vertical 9:16 composition");
      expect(() => JSON.parse(variant.prompt)).toThrow();
    }
  });

  it("builds plain pendant prompts with selected color, metal, and karat", () => {
    const variants = buildVariants({
      userId: "demo",
      pendantFinish: "plain",
      styleId: "plain_style_1",
      text: "Aurora",
      plainColor: "rose_gold",
      plainMetal: "gold",
      plainKarat: "18k",
      plainChain: "box"
    });

    expect(variants).toHaveLength(2);
    for (const variant of variants) {
      expect(variant.prompt).toContain('Change the text to "Aurora"');
      expect(variant.prompt).toContain("using the attached reference image plain_style_1.png");
      expect(variant.prompt).toContain("The color should be metallic Rose Gold");
      expect(variant.prompt).toContain("Material selection: Solid Gold");
      expect(variant.prompt).toContain("Karat selection: 18K");
      expect(variant.prompt).toContain("Chain style selection: Box chain");
      expect(variant.prompt).toContain("no diamonds, no stones, no pave setting");
    }
    expect(variants[0].attachments).toContain(`${process.cwd()}/public/plain-pendants/plain_style_1.png`);
    expect(variants[0].prompt).toContain("vertical 9:16 composition");
  });

  it("builds Cloister Black plain prompts for style 6", () => {
    const variants = buildVariants({
      userId: "demo",
      pendantFinish: "plain",
      styleId: "plain_style_6",
      text: "Rox",
      plainColor: "silver",
      plainMetal: "silver",
      plainChain: "rope"
    });

    expect(variants[0].prompt).toContain("Use Cloister Black font");
    expect(variants[0].prompt).not.toContain("Commercial Script CE font");
    expect(variants[0].attachments).toContain(`${process.cwd()}/public/plain-pendants/plain_style_6.png`);
  });

  it("rejects plain solid-gold prompts without karat", () => {
    expect(() => buildVariants({
      userId: "demo",
      pendantFinish: "plain",
      styleId: "plain_style_1",
      text: "Aurora",
      plainColor: "gold",
      plainMetal: "gold",
      plainChain: "rope"
    })).toThrow(/plainKarat/);
  });
});
