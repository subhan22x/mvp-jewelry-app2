import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getDefaultAccountId } from "@/src/lib/account";
import { isOwnerRequestAuthenticated } from "@/src/lib/owner-auth";
import { collectionForCategory } from "@/src/lib/owner-products";
import { savePublicUpload } from "@/src/lib/storage/public-media";
import { slugify } from "@/src/lib/slug";

type Ctx = { params: { productId: string } };

const PRICE_MODES = new Set(["set", "range", "ask"]);

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(form: FormData, key: string) {
  const value = text(form, key);
  return value || null;
}

function fileFromForm(form: FormData, key: string) {
  const value = form.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function productStatus(form: FormData) {
  return text(form, "status") === "published";
}

function priceMode(form: FormData) {
  const value = text(form, "priceMode") || "ask";
  return PRICE_MODES.has(value) ? value : "ask";
}

function priceLabel(mode: string, raw: string | null) {
  if (mode === "ask") return raw || "Ask for price";
  return raw;
}

async function findProduct(productId: string) {
  const accountId = getDefaultAccountId();
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.accountId !== accountId) return null;
  return product;
}

export async function PATCH(req: Request, { params }: Ctx) {
  if (!isOwnerRequestAuthenticated(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const existing = await findProduct(params.productId);
  if (!existing) return NextResponse.json({ error: "Piece not found." }, { status: 404 });

  try {
    const accountId = getDefaultAccountId();
    const form = await req.formData();
    const name = text(form, "name");
    if (!name) return NextResponse.json({ error: "Piece name is required." }, { status: 400 });

    const { collection, slug: category } = await collectionForCategory(accountId, text(form, "category"));
    const image = fileFromForm(form, "image");
    const imageUrl = image
      ? await savePublicUpload(image, `accounts/${accountId}/products`, `${slugify(name) || "piece"}-${Date.now()}`)
      : existing.imageUrl;
    const mode = priceMode(form);

    const product = await prisma.product.update({
      where: { id: existing.id },
      data: {
        collectionId: collection.id,
        category,
        name,
        description: optionalText(form, "description"),
        imageUrl,
        priceMode: mode,
        priceLabel: priceLabel(mode, optionalText(form, "priceLabel")),
        material: optionalText(form, "material"),
        metalDetail: optionalText(form, "metalDetail"),
        stoneQuality: optionalText(form, "stoneQuality"),
        weightLabel: optionalText(form, "weightLabel"),
        isActive: productStatus(form),
      },
    });

    return NextResponse.json({ product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to update piece.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  if (!isOwnerRequestAuthenticated(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const existing = await findProduct(params.productId);
  if (!existing) return NextResponse.json({ error: "Piece not found." }, { status: 404 });

  await prisma.product.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
