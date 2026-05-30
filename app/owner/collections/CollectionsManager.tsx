"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { PRODUCT_CATEGORIES, categoryLabel, normalizeProductCategory } from "@/src/lib/storefront-categories";

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  category: string | null;
  collectionSlug: string | null;
  priceLabel: string | null;
  priceMode: string | null;
  material: string | null;
  metalDetail: string | null;
  stoneQuality: string | null;
  weightLabel: string | null;
  isActive: boolean;
};

type Draft = {
  id?: string;
  category: string;
  name: string;
  description: string;
  imageFile: File | null;
  existingImageUrl: string;
  priceMin: number;
  priceMax: number;
  material: string;
  metalDetail: string;
  stoneQuality: string;
  weightLabel: string;
};

const EMPTY_DRAFT: Draft = {
  category: "pendant",
  name: "",
  description: "",
  imageFile: null,
  existingImageUrl: "",
  priceMin: 0,
  priceMax: 40000,
  material: "",
  metalDetail: "",
  stoneQuality: "",
  weightLabel: "",
};

const MATERIALS = [
  { value: "", label: "Select material" },
  { value: "gold", label: "Gold" },
  { value: "white_gold", label: "White Gold" },
  { value: "rose_gold", label: "Rose Gold" },
  { value: "two_tone", label: "Two-tone" },
  { value: "silver", label: "Silver" },
  { value: "titanium", label: "Titanium" },
  { value: "other", label: "Other" },
];

const STONES = [
  { value: "None", label: "None" },
  { value: "Moissanite", label: "Moissanite" },
  { value: "Lab Diamonds", label: "Lab Diamonds" },
  { value: "Natural Diamonds", label: "Natural Diamonds" },
  { value: "CZ", label: "CZ" },
  { value: "Other", label: "Other" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function priceLabelFromRange(min: number, max: number) {
  return min === max ? formatCurrency(min) : `${formatCurrency(min)}-${formatCurrency(max)}`;
}

function priceRangeFromLabel(label: string | null) {
  const numbers = [...(label ?? "").matchAll(/\d[\d,]*/g)]
    .map(match => Number.parseInt(match[0].replace(/,/g, ""), 10))
    .filter(Number.isFinite);
  const min = Math.min(Math.max(numbers[0] ?? 0, 0), 40000);
  const max = Math.min(Math.max(numbers[1] ?? numbers[0] ?? 40000, 0), 40000);
  return min <= max ? { priceMin: min, priceMax: max } : { priceMin: max, priceMax: min };
}

function normalizeStone(value: string | null) {
  const match = STONES.find(stone => stone.value.toLowerCase() === (value ?? "").toLowerCase());
  return match?.value ?? "";
}

export default function CollectionsManager({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeCategory, setActiveCategory] = useState("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleProducts = useMemo(() => {
    if (activeCategory === "all") return products;
    return products.filter(product => normalizeProductCategory(product.category ?? product.collectionSlug) === activeCategory);
  }, [activeCategory, products]);

  function editProduct(product: ProductRow) {
    const priceRange = priceRangeFromLabel(product.priceLabel);
    setError(null);
    setStatus(null);
    setDraft({
      id: product.id,
      category: normalizeProductCategory(product.category ?? product.collectionSlug),
      name: product.name,
      description: product.description ?? "",
      imageFile: null,
      existingImageUrl: product.imageUrl,
      priceMin: priceRange.priceMin,
      priceMax: priceRange.priceMax,
      material: product.material ?? "",
      metalDetail: product.metalDetail ?? "",
      stoneQuality: normalizeStone(product.stoneQuality),
      weightLabel: product.weightLabel ?? "",
    });
  }

  async function saveProduct(statusValue: "draft" | "published") {
    if (!draft) return;
    setError(null);
    setStatus(null);

    const form = new FormData();
    form.set("category", draft.category);
    form.set("name", draft.name);
    form.set("description", draft.description);
    if (draft.imageFile) form.set("image", draft.imageFile);
    form.set("priceMode", "range");
    form.set("priceLabel", priceLabelFromRange(draft.priceMin, draft.priceMax));
    form.set("material", draft.material);
    form.set("metalDetail", draft.metalDetail);
    form.set("stoneQuality", draft.stoneQuality);
    form.set("weightLabel", draft.weightLabel);
    form.set("status", statusValue === "published" ? "published" : "draft");

    const url = draft.id ? `/api/owner/products/${draft.id}` : "/api/owner/products";
    const response = await fetch(url, { method: draft.id ? "PATCH" : "POST", body: form });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? "Unable to save piece.");
      return;
    }

    setStatus(statusValue === "published" ? "Piece published." : "Draft saved.");
    setDraft(null);
    startTransition(() => router.refresh());
  }

  async function deleteProduct(productId: string) {
    if (!window.confirm("Delete this piece?")) return;
    setError(null);
    const response = await fetch(`/api/owner/products/${productId}`, { method: "DELETE" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? "Unable to delete piece.");
      return;
    }
    setStatus("Piece deleted.");
    startTransition(() => router.refresh());
  }

  return (
    <>
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-[#e1e2ec] md:text-4xl">Collections</h1>
          <p className="mt-2 text-[15px] text-[#c2c6d6]">Manage public profile product categories and pieces.</p>
        </div>
        <button onClick={() => setDraft({ ...EMPTY_DRAFT })} className="rounded-full bg-[#f7bc5f] px-5 py-3 text-sm font-bold text-black hover:bg-[#ffd88a]">
          Add Piece
        </button>
      </section>

      <section className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <CategoryButton label="All" active={activeCategory === "all"} onClick={() => setActiveCategory("all")} />
        {PRODUCT_CATEGORIES.map(category => (
          <CategoryButton key={category.slug} label={category.label} active={activeCategory === category.slug} onClick={() => setActiveCategory(category.slug)} />
        ))}
      </section>

      {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p>}
      {status && <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">{status}</p>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleProducts.map(product => (
          <article key={product.id} className="overflow-hidden rounded-xl border border-white/5 bg-[#17191F]">
            <div className="aspect-[4/3] bg-black">
              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f7bc5f]">{categoryLabel(product.category ?? product.collectionSlug)}</p>
                  <h2 className="mt-1 text-lg font-bold">{product.name}</h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${product.isActive ? "bg-emerald-500/10 text-emerald-200" : "bg-white/5 text-[#8c909f]"}`}>
                  {product.isActive ? "Published" : "Draft"}
                </span>
              </div>
              {product.description && <p className="mt-3 text-sm leading-6 text-[#c2c6d6]">{product.description}</p>}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[#8c909f]">
                <Spec label="Price" value={product.priceLabel} />
                <Spec label="Material" value={product.material?.replace(/_/g, " ")} />
                <Spec label="Metal" value={product.metalDetail} />
                <Spec label="Stone" value={product.stoneQuality} />
                <Spec label="Weight" value={product.weightLabel} />
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => editProduct(product)} className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-[#e1e2ec] hover:bg-white/5">Edit</button>
                <button onClick={() => deleteProduct(product.id)} className="rounded-lg border border-red-400/30 px-3 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/10">Delete</button>
              </div>
            </div>
          </article>
        ))}
        {visibleProducts.length === 0 && (
          <div className="rounded-xl border border-white/5 bg-[#17191F] p-6 text-center text-sm text-[#8c909f] md:col-span-2 xl:col-span-3">
            No pieces in this category yet.
          </div>
        )}
      </section>

      {draft && (
        <PieceModal
          draft={draft}
          setDraft={setDraft}
          busy={isPending}
          error={error}
          onClose={() => setDraft(null)}
          onSaveDraft={() => saveProduct("draft")}
          onPublish={() => saveProduct("published")}
        />
      )}
    </>
  );
}

function CategoryButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${active ? "bg-[#f7bc5f] text-black" : "border border-white/10 bg-[#17191F] text-[#c2c6d6]"}`}>
      {label}
    </button>
  );
}

function Spec({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-1 font-semibold capitalize text-[#e1e2ec]">{value}</p>
    </div>
  );
}

function PieceModal({
  draft,
  setDraft,
  busy,
  error,
  onClose,
  onSaveDraft,
  onPublish,
}: {
  draft: Draft;
  setDraft: Dispatch<SetStateAction<Draft | null>>;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}) {
  const imagePreview = useMemo(() => {
    if (!draft.imageFile) return draft.existingImageUrl;
    return URL.createObjectURL(draft.imageFile);
  }, [draft.existingImageUrl, draft.imageFile]);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft(current => current ? { ...current, [key]: value } : current);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto max-w-2xl rounded-xl border border-white/10 bg-[#101114] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <h2 className="text-xl font-bold">{draft.id ? "Edit Piece" : "Add Piece"}</h2>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#f7bc5f] hover:bg-white/10">x</button>
        </div>

        <div className="grid gap-5 p-5">
          <label>
            <span className="text-sm font-bold">Photo</span>
            <div className="mt-2 grid gap-3 sm:grid-cols-[160px_1fr]">
              <div className="aspect-square overflow-hidden rounded-xl border border-white/10 bg-black">
                {imagePreview ? <img src={imagePreview} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-[#8c909f]">No image</div>}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={event => update("imageFile", event.target.files?.[0] ?? null)}
                className="h-12 rounded-lg border border-white/10 bg-[#17191F] px-3 py-2 text-sm text-[#c2c6d6] file:mr-3 file:rounded-full file:border-0 file:bg-[#f7bc5f] file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-black"
              />
            </div>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Category" value={draft.category} onChange={value => update("category", value)} options={PRODUCT_CATEGORIES.map(category => ({ value: category.slug, label: category.label }))} />
            <Field label="Piece name" value={draft.name} onChange={value => update("name", value)} placeholder="e.g. VVS Cuban Link" />
          </div>
          <Textarea label="Description" value={draft.description} onChange={value => update("description", value)} placeholder="Describe material, stones, craftsmanship..." />

          <div className="grid gap-4 sm:grid-cols-2">
            <PriceRangeSlider
              min={draft.priceMin}
              max={draft.priceMax}
              onChange={(priceMin, priceMax) => setDraft(current => current ? { ...current, priceMin, priceMax } : current)}
            />
            <Select label="Material" value={draft.material} onChange={value => update("material", value)} options={MATERIALS} />
            <Field label="Metal detail" value={draft.metalDetail} onChange={value => update("metalDetail", value)} placeholder="14K, sterling silver..." />
            <Select label="Stone" value={draft.stoneQuality} onChange={value => update("stoneQuality", value)} options={[{ value: "", label: "Select stone" }, ...STONES]} />
            <Field label="Weight" value={draft.weightLabel} onChange={value => update("weightLabel", value)} placeholder="40g" />
          </div>
          {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-white/10 p-5">
          <button disabled={busy} onClick={onSaveDraft} className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-[#c2c6d6] hover:bg-white/5 disabled:opacity-60">Save Draft</button>
          <button disabled={busy} onClick={onPublish} className="rounded-full bg-[#f7bc5f] px-4 py-2 text-sm font-bold text-black hover:bg-[#ffd88a] disabled:opacity-60">Save & Publish</button>
        </div>
      </div>
    </div>
  );
}

function PriceRangeSlider({ min, max, onChange }: { min: number; max: number; onChange: (min: number, max: number) => void }) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  const visibleLower = Math.min(lower, 40000);
  const visibleUpper = Math.min(upper, 40000);
  const lowerPercent = (visibleLower / 40000) * 100;
  const upperPercent = (visibleUpper / 40000) * 100;

  function updateMin(value: string) {
    const nextMin = Math.min(Number(value), upper);
    onChange(nextMin, upper);
  }

  function updateMax(value: string) {
    const nextMax = Math.max(Number(value), lower);
    onChange(lower, nextMax);
  }

  function updateTypedMin(value: string) {
    const nextMin = Math.max(Number(value) || 0, 0);
    onChange(nextMin, Math.max(upper, nextMin));
  }

  function updateTypedMax(value: string) {
    const nextMax = Math.max(Number(value) || 0, 0);
    onChange(Math.min(lower, nextMax), nextMax);
  }

  return (
    <div className="sm:col-span-2">
      <div className="flex items-end justify-between gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">Price range</span>
        <div className="flex items-center gap-2">
          <input
            aria-label="Minimum price"
            type="number"
            min="0"
            step="500"
            value={lower}
            onChange={event => updateTypedMin(event.target.value)}
            className="h-8 w-20 rounded-md border border-white/10 bg-[#101114] px-2 text-right text-xs font-bold text-[#f7bc5f] outline-none focus:border-[#f7bc5f]"
          />
          <span className="text-xs font-bold text-[#8c909f]">-</span>
          <input
            aria-label="Maximum price"
            type="number"
            min="0"
            step="500"
            value={upper}
            onChange={event => updateTypedMax(event.target.value)}
            className="h-8 w-20 rounded-md border border-white/10 bg-[#101114] px-2 text-right text-xs font-bold text-[#f7bc5f] outline-none focus:border-[#f7bc5f]"
          />
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-white/10 bg-[#17191F] px-3 py-4">
        <div className="relative mx-1 h-14">
          <div
            className="absolute top-7 h-1.5 rounded-full bg-white/15"
            style={{ left: 0, right: 0 }}
          />
          <div
            className="absolute top-7 h-1.5 rounded-full bg-[#f7bc5f]"
            style={{ left: `${lowerPercent}%`, right: `${100 - upperPercent}%` }}
          />
          <span
            className="absolute top-0 -translate-x-1/2 rounded bg-[#7c3cff] px-2 py-1 text-[11px] font-bold leading-none text-white"
            style={{ left: `${lowerPercent}%` }}
          >
            {formatCurrency(lower)}
          </span>
          <span
            className="absolute top-0 -translate-x-1/2 rounded bg-[#7c3cff] px-2 py-1 text-[11px] font-bold leading-none text-white"
            style={{ left: `${upperPercent}%` }}
          >
            {formatCurrency(upper)}
          </span>
          <input
            aria-label="Minimum price"
            type="range"
            min="0"
            max="40000"
            step="500"
            value={visibleLower}
            onChange={event => updateMin(event.target.value)}
            className="pointer-events-none absolute top-[19px] z-20 h-6 w-full appearance-none bg-transparent range-thumb"
          />
          <input
            aria-label="Maximum price"
            type="range"
            min="0"
            max="40000"
            step="500"
            value={visibleUpper}
            onChange={event => updateMax(event.target.value)}
            className="pointer-events-none absolute top-[19px] z-30 h-6 w-full appearance-none bg-transparent range-thumb"
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-[#8c909f]">
          <span>$0</span>
          <span>$40k</span>
        </div>
      </div>
      <style jsx>{`
        .range-thumb::-webkit-slider-runnable-track {
          background: transparent;
          border: 0;
        }
        .range-thumb::-webkit-slider-thumb {
          appearance: none;
          pointer-events: auto;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          border: 3px solid #7c3cff;
          background: #ffffff;
          box-shadow: 0 0 0 3px #17191f;
          cursor: pointer;
        }
        .range-thumb::-moz-range-track {
          background: transparent;
          border: 0;
        }
        .range-thumb::-moz-range-thumb {
          pointer-events: auto;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          border: 3px solid #7c3cff;
          background: #ffffff;
          box-shadow: 0 0 0 3px #17191f;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">{label}</span>
      <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#17191F] px-3 text-sm text-[#e1e2ec] outline-none placeholder:text-white/30 focus:border-[#f7bc5f]" />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#17191F] px-3 text-sm text-[#e1e2ec] outline-none focus:border-[#f7bc5f]">
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">{label}</span>
      <textarea value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} rows={4} className="mt-2 w-full rounded-lg border border-white/10 bg-[#17191F] px-3 py-3 text-sm text-[#e1e2ec] outline-none placeholder:text-white/30 focus:border-[#f7bc5f]" />
    </label>
  );
}
