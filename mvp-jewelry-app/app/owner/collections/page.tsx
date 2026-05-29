import { prisma } from "@/server/db/client";
import { getDefaultAccountId } from "@/src/lib/account";
import { ensureProductCollections } from "@/src/lib/owner-products";
import OwnerFrame from "../OwnerFrame";
import OwnerLoginForm from "../OwnerLoginForm";
import { isOwnerAuthenticated } from "../_auth";
import CollectionsManager from "./CollectionsManager";

export const dynamic = "force-dynamic";

export default async function OwnerCollectionsPage() {
  if (!isOwnerAuthenticated()) return <OwnerLoginForm />;

  const accountId = getDefaultAccountId();
  await ensureProductCollections(accountId);
  const products = await prisma.product.findMany({
    where: { accountId },
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    include: { collection: { select: { slug: true } } }
  });

  return (
    <OwnerFrame active="Collections">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 md:px-6">
        <CollectionsManager
          products={products.map(product => ({
            id: product.id,
            name: product.name,
            description: product.description,
            imageUrl: product.imageUrl,
            category: product.category,
            collectionSlug: product.collection?.slug ?? null,
            priceLabel: product.priceLabel,
            priceMode: product.priceMode,
            material: product.material,
            metalDetail: product.metalDetail,
            stoneQuality: product.stoneQuality,
            weightLabel: product.weightLabel,
            isActive: product.isActive,
          }))}
        />
      </div>
    </OwnerFrame>
  );
}
