import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";
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

function firstAttachments(input: Parameters<typeof buildVariants>[0]) {
  return buildVariants(input)[0].attachments;
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

  it("capitalizes only variant 2 when the submitted name is all lowercase", () => {
    const variants = buildVariants({ ...baseInput, styleId: "deja", text: "melissa" }).map(variant => ({
      variant: variant.variant,
      prompt: JSON.parse(variant.prompt)
    }));

    expect(variants[0].prompt.pendant.text["Primary TEXT"]).toEqual(["melissa"]);
    expect(variants[1].prompt.pendant.text["Primary TEXT"]).toEqual(["Melissa"]);
  });

  it("keeps non-lowercase submitted names unchanged across both variants", () => {
    const capitalized = buildVariants({ ...baseInput, styleId: "deja", text: "Melissa" }).map(variant => JSON.parse(variant.prompt));
    const allCaps = buildVariants({ ...baseInput, styleId: "deja", text: "MELISSA" }).map(variant => JSON.parse(variant.prompt));
    const mixed = buildVariants({ ...baseInput, styleId: "deja", text: "MeLiSsA" }).map(variant => JSON.parse(variant.prompt));

    expect(capitalized.map(prompt => prompt.pendant.text["Primary TEXT"])).toEqual([["Melissa"], ["Melissa"]]);
    expect(allCaps.map(prompt => prompt.pendant.text["Primary TEXT"])).toEqual([["MELISSA"], ["MELISSA"]]);
    expect(mixed.map(prompt => prompt.pendant.text["Primary TEXT"])).toEqual([["MeLiSsA"], ["MeLiSsA"]]);
  });

  it("applies lowercase variant capitalization before style-owned all-caps rules", () => {
    const variants = buildVariants({ ...baseInput, styleId: "king", text: "melissa" });

    expect(variants[0].prompt).toContain('change the text on this pendant to "MELISSA"');
    expect(variants[1].prompt).toContain('change the text on this pendant to "MELISSA"');
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

  it("capitalizes variant 2 lowercase text in natural-language prompts and text references", () => {
    const variants = buildVariants({
      ...baseInput,
      styleId: "samoa",
      text: "melissa",
      emblem: "none"
    }, { promptMode: "natural_language" });

    expect(variants[0].prompt).toContain('changing the main text to "melissa"');
    expect(variants[1].prompt).toContain('changing the main text to "Melissa"');

    const firstDescriptorPath = variants[0].attachments.find(attachment => attachment.endsWith(".style-text-reference.json"));
    const secondDescriptorPath = variants[1].attachments.find(attachment => attachment.endsWith(".style-text-reference.json"));
    expect(firstDescriptorPath).toBeTruthy();
    expect(secondDescriptorPath).toBeTruthy();

    const firstDescriptor = JSON.parse(fs.readFileSync(firstDescriptorPath!, "utf8"));
    const secondDescriptor = JSON.parse(fs.readFileSync(secondDescriptorPath!, "utf8"));
    expect(firstDescriptor.text).toBe("melissa");
    expect(secondDescriptor.text).toBe("Melissa");
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

  it("builds SAMOA with a typography reference descriptor and omits emblem copy for none", () => {
    const variants = buildVariants({
      ...baseInput,
      styleId: "samoa",
      text: "Sky",
      emblem: "none"
    }, { promptMode: "natural_language" });

    expect(variants).toHaveLength(2);
    for (const variant of variants) {
      expect(variant.prompt).toContain('changing the main text to "Sky"');
      expect(variant.prompt).toContain("An additional typography reference image is attached");
      expect(variant.prompt).not.toContain("Add a none");
      expect(variant.prompt).not.toContain("above the lettering where the pendant bail normally sits");
      expect(variant.attachments).toContain(`${process.cwd()}/public/pendants/samoa/reference-rose.png`);
      expect(variant.attachments.some(attachment => attachment.endsWith(".style-text-reference.json"))).toBe(true);
    }
  });

  it("uses the selected primary-metal Samoa pendant reference", () => {
    expect(buildVariants({
      ...baseInput,
      styleId: "samoa",
      primaryMetal: "yellow_gold",
      secondaryMetal: "white_gold",
      emblem: "none"
    }, { promptMode: "natural_language" })[0].attachments).toContain(`${process.cwd()}/public/pendants/samoa/reference-yellow.png`);

    expect(buildVariants({
      ...baseInput,
      styleId: "samoa",
      primaryMetal: "rose_gold",
      secondaryMetal: "white_gold",
      emblem: "none"
    }, { promptMode: "natural_language" })[0].attachments).toContain(`${process.cwd()}/public/pendants/samoa/reference-rose.png`);

    expect(buildVariants({
      ...baseInput,
      styleId: "samoa",
      twoTone: false,
      primaryMetal: "white_gold",
      secondaryMetal: null,
      emblem: "none"
    }, { promptMode: "natural_language" })[0].attachments).toContain(`${process.cwd()}/public/pendants/samoa/reference-white.png`);
  });

  it("adds typography reference descriptors for every iced-out style font mapping", () => {
    const styleIds = ["deja", "gatti", "jaida", "jhon", "jwae", "king", "lexy", "neiko", "samoa"];

    for (const styleId of styleIds) {
      const variants = buildVariants({ ...baseInput, styleId, text: "Sky" }, { promptMode: "natural_language" });
      for (const variant of variants) {
        expect(
          variant.attachments.some(attachment => attachment.endsWith(".style-text-reference.json")),
          `${styleId} variant ${variant.variant} should include a typography reference`
        ).toBe(true);
      }
    }
  });

  it("builds POOH with three equal pendant references, a color-aware emblem, and no typography reference", () => {
    const variants = buildVariants({
      ...baseInput,
      styleId: "pooh",
      text: "Jason",
      primaryMetal: "yellow_gold",
      secondaryMetal: "white_gold",
      emblem: "heart"
    }, { promptMode: "natural_language" });

    expect(variants).toHaveLength(2);
    for (const variant of variants) {
      expect(variant.prompt).toContain('changing the main text to "Jason"');
      expect(variant.prompt).toContain("heart emblem above the lettering");
      expect(variant.prompt).toContain("Use a two tone Yellow Gold and White Gold color scheme");
      expect(variant.prompt).not.toContain("{{insert text}}");
      expect(variant.prompt).not.toContain("{{emblem name}}");
      expect(variant.prompt).not.toContain("{{two tone Yellow Gold and White Gold}}");
      expect(variant.attachments).toContain(`${process.cwd()}/public/pendants/pooh/reference-rose.jpg`);
      expect(variant.attachments).toContain(`${process.cwd()}/public/pendants/pooh/reference-white.jpg`);
      expect(variant.attachments).toContain(`${process.cwd()}/public/pendants/pooh/reference-yellow.jpg`);
      expect(variant.attachments).toContain(`${process.cwd()}/public/emblems/colored/heart-yellow-gold.png`);
      expect(variant.attachments.some(attachment => attachment.endsWith(".style-text-reference.json"))).toBe(false);
    }
  });

  it("uses style editor overrides for future prompt templates and typography render settings", () => {
    const variants = buildVariants({
      ...baseInput,
      styleId: "samoa",
      text: "Sky"
    }, {
      promptMode: "natural_language",
      styleOverride: {
        naturalLanguageTemplateRaw: 'Override prompt for "{{TEXT_SNIPPET}}"',
        textReferenceOptions: {
          backgroundColor: "#ffffff",
          fillColor: "#111111",
          outlineColor: "#ffcc55",
          outlineWidth: 12
        }
      }
    });
    const descriptorPath = variants[0].attachments.find(attachment => attachment.endsWith(".style-text-reference.json"));
    expect(variants[0].prompt).toContain('Override prompt for "Sky"');
    expect(descriptorPath).toBeTruthy();

    const descriptor = JSON.parse(fs.readFileSync(descriptorPath!, "utf8"));
    expect(descriptor.renderOptions).toMatchObject({
      backgroundColor: "#ffffff",
      fillColor: "#111111",
      outlineColor: "#ffcc55",
      outlineWidth: 12
    });
  });

  it("can disable typography reference attachments through style editor overrides", () => {
    const variants = buildVariants({
      ...baseInput,
      styleId: "samoa",
      text: "Sky"
    }, {
      promptMode: "natural_language",
      styleOverride: {
        attachTextReference: false
      }
    });

    expect(variants[0].attachments.some(attachment => attachment.endsWith(".style-text-reference.json"))).toBe(false);
  });

  it("uses primary-metal colored emblem references for iced-out pendants", () => {
    expect(firstAttachments({
      ...baseInput,
      styleId: "deja",
      primaryMetal: "rose_gold",
      secondaryMetal: "white_gold",
      emblem: "butterfly"
    })).toContain(`${process.cwd()}/public/emblems/colored/butterfly-rose-gold.png`);

    expect(firstAttachments({
      ...baseInput,
      styleId: "deja",
      primaryMetal: "yellow_gold",
      secondaryMetal: "white_gold",
      emblem: "crown"
    })).toContain(`${process.cwd()}/public/emblems/colored/crown-yellow-gold.png`);

    expect(firstAttachments({
      ...baseInput,
      styleId: "deja",
      twoTone: false,
      primaryMetal: "white_gold",
      secondaryMetal: null,
      emblem: "heart"
    })).toContain(`${process.cwd()}/public/emblems/colored/heart-white-gold.png`);
  });

  it("does not attach colored emblems when no iced-out emblem is selected", () => {
    const attachments = firstAttachments({
      ...baseInput,
      styleId: "deja",
      emblem: "none"
    });

    expect(attachments.some(attachment => attachment.includes("/public/emblems/colored/"))).toBe(false);
    expect(attachments.some(attachment => attachment.includes("/public/emblems/"))).toBe(false);
  });

  it("keeps plain pendant flow isolated from colored iced-out emblems", () => {
    const attachments = firstAttachments({
      userId: "demo",
      pendantFinish: "plain",
      styleId: "plain_style_1",
      text: "Aurora",
      plainColor: "rose_gold",
      plainMetal: "gold",
      plainKarat: "18k",
      plainChain: "box"
    });

    expect(attachments).toContain(`${process.cwd()}/public/plain-pendants/plain_style_1.png`);
    expect(attachments.some(attachment => attachment.includes("/public/emblems/colored/"))).toBe(false);
  });

  it("falls back to the style emblem reference when a colored emblem is unavailable", () => {
    const originalExistsSync = fs.existsSync;
    const existsSpy = vi.spyOn(fs, "existsSync").mockImplementation((filePath) => {
      if (filePath.toString().endsWith("/public/emblems/colored/butterfly-rose-gold.png")) {
        return false;
      }
      return originalExistsSync(filePath);
    });

    try {
      const attachments = firstAttachments({
        ...baseInput,
        styleId: "deja",
        primaryMetal: "rose_gold",
        secondaryMetal: "white_gold",
        emblem: "butterfly"
      });

      expect(attachments).toContain(`${process.cwd()}/public/emblems/BUTTERFLY EMBLEM.png`);
      expect(attachments).not.toContain(`${process.cwd()}/public/emblems/colored/butterfly-rose-gold.png`);
    } finally {
      existsSpy.mockRestore();
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
