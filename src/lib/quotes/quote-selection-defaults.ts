type QuoteSelectionSource = {
  quoteMaterial: string | null;
  quoteMaterialKarat: string | null;
  quoteStoneType: string | null;
  metalType: string | null;
  stoneType: string | null;
  plainMetal: string | null;
  plainKarat: string | null;
  primaryMetal: string | null;
  pendantFinish: string | null;
};

export function quoteSelectionDefaults(source: QuoteSelectionSource) {
  const selectedGoldColor = source.primaryMetal === "rose_gold"
    || source.primaryMetal === "white_gold"
    || source.primaryMetal === "yellow_gold";
  const material = source.quoteMaterial
    ?? source.metalType
    ?? source.plainMetal
    ?? (selectedGoldColor ? "gold" : null);

  return {
    material,
    materialKarat: source.quoteMaterialKarat ?? (material === "gold" ? source.plainKarat : null),
    stoneType: source.quoteStoneType
      ?? source.stoneType
      ?? (source.pendantFinish === "icedout" ? "natural_diamonds" : null)
  };
}
