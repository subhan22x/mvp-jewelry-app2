import { prisma } from "@/server/db/client";
import { PRODUCT_CATEGORIES, normalizeProductCategory, type ProductCategorySlug } from "@/src/lib/storefront-categories";

export async function ensureProductCollections(accountId: string) {
  for (const [index, category] of PRODUCT_CATEGORIES.entries()) {
    await prisma.productCollection.upsert({
      where: { accountId_slug: { accountId, slug: category.slug } },
      update: {
        title: category.label,
        sortOrder: index,
        isActive: true,
      },
      create: {
        accountId,
        title: category.label,
        slug: category.slug,
        sortOrder: index,
        isActive: true,
      },
    });
  }
}

export async function collectionForCategory(accountId: string, category: string | null | undefined) {
  const slug: ProductCategorySlug = normalizeProductCategory(category);
  await ensureProductCollections(accountId);
  const collection = await prisma.productCollection.findUnique({
    where: { accountId_slug: { accountId, slug } },
  });
  if (!collection) throw new Error("Product category is unavailable.");
  return { collection, slug };
}
