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
  material: string | null;
  metalDetail: string | null;
  stoneQuality: string | null;
  weightLabel: string | null;
  badgeLabel: string | null;
  isFeatured: boolean;
  category: string | null;
  collectionSlug: string | null;
};

export default function StorefrontCollections({ products, fallbackHref }: { products: StorefrontProduct[]; fallbackHref: string }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StorefrontProduct | null>(null);
  const visibleProducts = useMemo(() => {
    if (activeCategory === "all") return products;
    return products.filter(product => normalizeProductCategory(product.category ?? product.collectionSlug) === activeCategory);
  }, [activeCategory, products]);

  return (
    <section className="px-5 py-7">
      <div className="mb-4">
        <h2 className="text-sm font-black uppercase tracking-[0.22em]">Collections</h2>
      </div>

      <div className="relative mb-5 pr-12">
        <div className={`flex gap-2 overflow-hidden transition-all ${filtersExpanded ? "flex-wrap" : "max-h-10 flex-nowrap"}`}>
          <FilterButton label="All" active={activeCategory === "all"} onClick={() => setActiveCategory("all")} />
          {PRODUCT_CATEGORIES.map(category => (
            <FilterButton key={category.slug} label={category.label} active={activeCategory === category.slug} onClick={() => setActiveCategory(category.slug)} />
          ))}
        </div>
        <button
          type="button"
          aria-label={filtersExpanded ? "Collapse collection filters" : "Expand collection filters"}
          aria-expanded={filtersExpanded}
          onClick={() => setFiltersExpanded(value => !value)}
          className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border border-[#342E26] bg-[#1C1915] pb-0.5 text-base font-bold leading-none text-[#D3A84F] transition hover:bg-[#2A241C] hover:text-white"
        >
          {filtersExpanded ? "-" : "+"}
        </button>
      </div>

      <div id="collection-products" className="grid grid-cols-2 gap-3">
        {visibleProducts.map(product => (
          <button key={product.id} onClick={() => setSelectedProduct(product)} className="group block overflow-hidden rounded-2xl bg-[#211D18] text-left">
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
          </button>
        ))}
        {visibleProducts.length === 0 && (
          <div className="col-span-2 rounded-2xl border border-[#342E26] bg-[#211D18] p-5 text-center text-sm text-[#8D8377]">
            No pieces in this category yet.
          </div>
        )}
      </div>
      {selectedProduct && <ProductViewModal product={selectedProduct} fallbackHref={fallbackHref} onClose={() => setSelectedProduct(null)} />}
    </section>
  );
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`h-9 shrink-0 rounded-full px-4 text-xs font-bold ${active ? "bg-white text-black" : "border border-[#342E26] bg-[#1C1915] uppercase text-[#B7AEA2]"}`}>
      {label}
    </button>
  );
}

function ProductViewModal({ product, fallbackHref, onClose }: { product: StorefrontProduct; fallbackHref: string; onClose: () => void }) {
  const category = categoryLabel(product.category ?? product.collectionSlug);
  const contactHref = product.href ?? fallbackHref;
  const specs = [
    { label: "Category", value: category },
    { label: "Price", value: product.priceLabel },
    { label: "Material", value: product.material?.replace(/_/g, " ") },
    { label: "Metal", value: product.metalDetail },
    { label: "Stone", value: product.stoneQuality },
    { label: "Weight", value: product.weightLabel },
  ].filter(spec => spec.value);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 px-4 py-6 backdrop-blur-sm">
      <button aria-label="Close product view" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div className="relative mx-auto w-full max-w-[430px] overflow-hidden rounded-3xl border border-[#342E26] bg-[#181512] text-[#F5F0E8] shadow-2xl shadow-black/60">
        <div className="relative aspect-square bg-[#24201A]">
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
          <button onClick={onClose} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/75 text-xl font-bold text-white">
            x
          </button>
          {(product.badgeLabel || product.isFeatured) && (
            <span className="absolute left-4 top-4 rounded-full bg-[#D3A84F] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-black">
              {product.badgeLabel ?? "Featured"}
            </span>
          )}
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#D3A84F]">{category}</p>
            <h3 className="mt-1 text-2xl font-black leading-tight">{product.name}</h3>
          </div>
        </div>

        <div className="p-5">
          {product.description && <p className="text-sm leading-6 text-[#B7AEA2]">{product.description}</p>}

          <div className="mt-5 grid grid-cols-2 gap-3">
            {specs.map(spec => (
              <div key={spec.label} className="rounded-2xl border border-[#342E26] bg-[#211D18] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8D8377]">{spec.label}</p>
                <p className="mt-1 text-sm font-bold capitalize text-[#F5F0E8]">{spec.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-2">
            <a href={contactHref} className="flex h-12 items-center justify-center rounded-full bg-[#D3A84F] text-sm font-black text-black hover:bg-[#f1c96c]">
              Ask About This Piece
            </a>
            <button onClick={onClose} className="flex h-11 items-center justify-center rounded-full border border-[#342E26] text-sm font-bold text-[#F5F0E8] hover:bg-[#211D18]">
              Back to Collections
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
