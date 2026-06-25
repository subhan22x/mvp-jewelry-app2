import type { LabCaseConfig } from "./types";

export type LabPreset = {
  id: string;
  label: string;
  description: string;
  cases: LabCaseConfig[];
};

/**
 * Sensible starting suites. These create editable case fields before running —
 * the owner can tweak text/metals/emblems before kicking off generation.
 */
export const LAB_PRESETS: LabPreset[] = [
  {
    id: "lexy_smoke",
    label: "Lexy smoke (2 cases, 4 gens)",
    description: "Two Lexy name pendants: single-tone rose + two-tone rose/white with butterfly emblem.",
    cases: [
      {
        family: "name",
        styleId: "lexy",
        text: "Alyssa",
        pendantFinish: "icedout",
        twoTone: false,
        primaryMetal: "rose_gold",
        secondaryMetal: null,
        emblem: "none"
      },
      {
        family: "name",
        styleId: "lexy",
        text: "Maria",
        pendantFinish: "icedout",
        twoTone: true,
        primaryMetal: "rose_gold",
        secondaryMetal: "white_gold",
        emblem: "butterfly"
      }
    ]
  },
  {
    id: "king_block",
    label: "King block-baguette (1 case, 2 gens)",
    description: "Single King name pendant, two-tone yellow + white gold, crown emblem.",
    cases: [
      {
        family: "name",
        styleId: "king",
        text: "MANA",
        pendantFinish: "icedout",
        twoTone: true,
        primaryMetal: "yellow_gold",
        secondaryMetal: "white_gold",
        emblem: "crown"
      }
    ]
  },
  {
    id: "mixed_metals",
    label: "Mixed metals across styles (4 cases, 8 gens)",
    description: "One case per metal (rose / white / yellow) on different styles + one two-tone.",
    cases: [
      {
        family: "name",
        styleId: "deja",
        text: "Sky",
        pendantFinish: "icedout",
        twoTone: false,
        primaryMetal: "rose_gold",
        secondaryMetal: null,
        emblem: "none"
      },
      {
        family: "name",
        styleId: "deja",
        text: "Sky",
        pendantFinish: "icedout",
        twoTone: false,
        primaryMetal: "white_gold",
        secondaryMetal: null,
        emblem: "none"
      },
      {
        family: "name",
        styleId: "jhon",
        text: "Rox",
        pendantFinish: "icedout",
        twoTone: false,
        primaryMetal: "yellow_gold",
        secondaryMetal: null,
        emblem: "none"
      },
      {
        family: "name",
        styleId: "jhon",
        text: "Rox",
        pendantFinish: "icedout",
        twoTone: true,
        primaryMetal: "yellow_gold",
        secondaryMetal: "white_gold",
        emblem: "spade"
      }
    ]
  },
  {
    id: "bracelet_smoke",
    label: "Bracelet smoke (2 cases, 2 gens)",
    description: "One icedout bracelet + one womens bracelet.",
    cases: [
      {
        family: "bracelet",
        productLine: "icedout",
        text: "ICE",
        styleId: "style_1",
        colorCombo: "yellow_gold",
        metalType: "gold"
      },
      {
        family: "bracelet",
        productLine: "womens",
        text: "Love",
        styleId: "womens_1",
        colorCombo: "rose_gold",
        metalType: "gold"
      }
    ]
  }
];

export function getPreset(id: string): LabPreset | undefined {
  return LAB_PRESETS.find(preset => preset.id === id);
}
