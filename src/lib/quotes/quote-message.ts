const MATERIAL_LABELS: Record<string, string> = {
  gold: "Gold",
  silver: "Silver",
  platinum: "Platinum"
};

const STONE_LABELS: Record<string, string> = {
  natural_diamonds: "Natural Diamonds",
  lab_diamonds: "Lab Diamonds",
  moissanite: "Moissanite",
  cz: "CZ",
  other: "Other"
};

function labeledValue(labels: Record<string, string>, value: string | null) {
  if (!value) return null;
  return labels[value] ?? value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

export function quoteMaterialLabel(material: string | null, karat: string | null) {
  const label = labeledValue(MATERIAL_LABELS, material);
  if (!label) return null;
  return material === "gold" && karat ? `${karat.toUpperCase()} ${label}` : label;
}

export function quoteStoneLabel(stone: string | null) {
  return labeledValue(STONE_LABELS, stone);
}

export function buildQuoteMessage({
  quotedPriceCents,
  estimatedDelivery,
  material,
  materialKarat,
  stoneType,
  notes,
  quoteUrl
}: {
  customerName: string;
  quotedPriceCents: number | null;
  estimatedDelivery: string | null;
  material: string | null;
  materialKarat: string | null;
  stoneType: string | null;
  notes: string | null;
  quoteUrl: string;
}) {
  const price = typeof quotedPriceCents === "number"
    ? (quotedPriceCents / 100).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    : null;
  const materialLabel = quoteMaterialLabel(material, materialKarat);
  const stoneLabel = quoteStoneLabel(stoneType);

  return [
    "Your custom jewelry quote is ready.",
    price ? `Price: ${price}` : "",
    estimatedDelivery ? `Estimated delivery: ${estimatedDelivery}` : "",
    materialLabel ? `Material: ${materialLabel}` : "",
    stoneLabel ? `Stone: ${stoneLabel}` : "",
    notes?.trim() ? `Message: ${notes.trim()}` : "",
    `Open your quote: ${quoteUrl}`
  ].filter(Boolean).join("\n");
}
