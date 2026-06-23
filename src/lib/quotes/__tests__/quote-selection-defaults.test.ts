import { describe, expect, it } from "vitest";
import { quoteSelectionDefaults } from "../quote-selection-defaults";

const emptySource = {
  quoteMaterial: null,
  quoteMaterialKarat: null,
  quoteStoneType: null,
  metalType: null,
  stoneType: null,
  plainMetal: null,
  plainKarat: null,
  primaryMetal: null,
  pendantFinish: null
};

describe("quoteSelectionDefaults", () => {
  it("uses the customer's iced-out selections", () => {
    expect(quoteSelectionDefaults({
      ...emptySource,
      metalType: "gold",
      stoneType: "natural_diamonds"
    })).toEqual({ material: "gold", materialKarat: null, stoneType: "natural_diamonds" });
  });

  it("uses the customer's plain pendant metal and karat", () => {
    expect(quoteSelectionDefaults({
      ...emptySource,
      plainMetal: "gold",
      plainKarat: "14k"
    })).toEqual({ material: "gold", materialKarat: "14k", stoneType: null });
  });

  it("preserves a saved owner override", () => {
    expect(quoteSelectionDefaults({
      ...emptySource,
      quoteMaterial: "platinum",
      quoteStoneType: "lab_diamonds",
      metalType: "gold",
      stoneType: "natural_diamonds"
    })).toEqual({ material: "platinum", materialKarat: null, stoneType: "lab_diamonds" });
  });

  it("uses historical customer-flow defaults when legacy rows lack material metadata", () => {
    expect(quoteSelectionDefaults({
      ...emptySource,
      primaryMetal: "rose_gold",
      pendantFinish: "icedout"
    })).toEqual({ material: "gold", materialKarat: null, stoneType: "natural_diamonds" });
  });
});
