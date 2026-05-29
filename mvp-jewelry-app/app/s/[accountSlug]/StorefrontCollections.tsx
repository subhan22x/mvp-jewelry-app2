"use client";

import { useMemo, useState } from "react";
import { PRODUCT_CATEGORIES, categoryLabel, normalizeProductCategory } from "@/src/lib/storefront-categories";

type StorefrontProduct = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  href: string | null;
  priceLabel: string | null;
  isFeatured: boolean;
  category: string | null;
  collectionSlug: string | null;
};

export default function StorefrontCollections({ products, fallbackHref }: { products: StorefrontProduct[]; fallbackHref: string }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const visibleProducts = useMemo(() => {
    if (activeCategory === "all") return products;
    return products.filter(product => normalizeProductCategory(product.category ?? product.collectionSlug) === activeCategory);
  }, [activeCategory, products]);

  return (
    <section className="px-5 py-7">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-sm font-black uppercase tracking-[0.22em]">Collections</h2>
        <a href="#collection-products" className="text-xs font-bold text-[#D3A84F] hover:text-white">
          Browse
        </a>
      </div>

      <div className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1">
        <FilterButton label="All" active={activeCategory === "all"} onClick={() => setActiveCategory("all")} />
        {PRODUCT_CATEGORIES.map(category => (
          <FilterButton key={category.slug} label={category.label} active={activeCategory === category.slug} onClick={() => setActiveCategory(category.slug)} />
        ))}
      </div>

      <div id="collection-products" className="grid grid-cols-2 gap-3">
        {visibleProducts.map(product => (
          <a key={product.id} href={product.href ?? fallbackHref} className="group block overflow-hidden rounded-2xl bg-[#211D18]">
            <div className="aspect-square overflow-hidden bg-[#24201A]">
              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
            </div>
            <div className="p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8D8377]">{categoryLabel(product.category ?? product.collectionSlug)}</p>
              <div className="mt-1 flex min-h-10 items-start justify-between gap-2">
                <p className="text-sm font-bold leading-5">{product.name}</p>
                {product.isFeatured && <span className="rounded-full bg-[#D3A84F] px-2 py-0.5 text-[10px] font-black text-black">Hot</span>}
              </div>
              {product.priceLabel && <p className="mt-1 text-xs font-bold text-[#D3A84F]">{product.priceLabel}</p>}
              {product.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#8D8377]">{product.description}</p>}
            </div>
          </a>
        ))}
        {visibleProducts.length === 0 && (
          <div className="col-span-2 rounded-2xl border border-[#342E26] bg-[#211D18] p-5 text-center text-sm text-[#8D8377]">
            No pieces in this category yet.
          </div>
        )}
      </div>
    </section>
  );
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${active ? "bg-white text-black" : "border border-[#342E26] bg-[#1C1915] uppercase text-[#B7AEA2]"}`}>
      {label}
    </button>
  );
}
