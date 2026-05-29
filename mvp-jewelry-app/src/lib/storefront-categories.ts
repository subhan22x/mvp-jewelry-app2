export const PRODUCT_CATEGORIES = [
  { slug: "pendant", label: "Pendants" },
  { slug: "watch", label: "Watches" },
  { slug: "ring", label: "Rings" },
  { slug: "bracelet", label: "Bracelets" },
  { slug: "earrings", label: "Earrings" },
  { slug: "chain", label: "Chains" },
  { slug: "grillz", label: "Grillz" },
  { slug: "other", label: "Other" },
] as const;

export type ProductCategorySlug = (typeof PRODUCT_CATEGORIES)[number]["slug"];

export const PRODUCT_CATEGORY_SLUGS = PRODUCT_CATEGORIES.map(category => category.slug);

const LEGACY_CATEGORY_SLUGS: Record<string, ProductCategorySlug> = {
  pendants: "pendant",
  watches: "watch",
  rings: "ring",
  bracelets: "bracelet",
  chains: "chain",
  grill: "grillz",
  grills: "grillz",
  trophy: "other",
  custom: "other",
  set: "other",
};

export function normalizeProductCategory(value?: string | null): ProductCategorySlug {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!normalized) return "other";
  if ((PRODUCT_CATEGORY_SLUGS as string[]).includes(normalized)) return normalized as ProductCategorySlug;
  return LEGACY_CATEGORY_SLUGS[normalized] ?? "other";
}

export function categoryLabel(value?: string | null) {
  const slug = normalizeProductCategory(value);
  return PRODUCT_CATEGORIES.find(category => category.slug === slug)?.label ?? "Other";
}
