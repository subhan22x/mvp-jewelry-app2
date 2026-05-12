import { prisma } from "@/server/db/client";
import { getDefaultAccountId } from "@/src/lib/account";
import OwnerFrame from "../OwnerFrame";
import OwnerLoginForm from "../OwnerLoginForm";
import { isOwnerAuthenticated } from "../_auth";

export const dynamic = "force-dynamic";

export default async function OwnerCollectionsPage() {
  if (!isOwnerAuthenticated()) return <OwnerLoginForm />;

  const accountId = getDefaultAccountId();
  const collections = await prisma.productCollection.findMany({
    where: { accountId },
    orderBy: [{ sortOrder: "asc" }],
    include: { Products: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }] } }
  });

  return (
    <OwnerFrame active="Collections">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 md:px-6">
        <section>
          <h1 className="text-[32px] font-bold tracking-tight text-[#e1e2ec] md:text-4xl">Collections</h1>
          <p className="mt-2 text-[15px] text-[#c2c6d6]">Manage public profile product categories and pieces.</p>
        </section>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {collections.map(collection => (
            <article key={collection.id} className="rounded-xl border border-white/5 bg-[#17191F] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{collection.title}</h2>
                  <p className="mt-1 text-xs text-[#8c909f]">/{collection.slug}</p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#c2c6d6]">{collection.Products.length} pieces</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {collection.Products.slice(0, 6).map(product => (
                  <img key={product.id} src={product.imageUrl} alt={product.name} className="aspect-square rounded-lg object-cover" />
                ))}
              </div>
              {collection.Products.length === 0 && <p className="mt-4 text-sm text-[#8c909f]">No active products in this collection yet.</p>}
            </article>
          ))}
        </section>
      </div>
    </OwnerFrame>
  );
}
