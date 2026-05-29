import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOwnerSessionValue, OWNER_SESSION_COOKIE } from "@/src/lib/owner-auth";

const mocks = vi.hoisted(() => ({
  productCreate: vi.fn(),
  productFindUnique: vi.fn(),
  productUpdate: vi.fn(),
  productDelete: vi.fn(),
  productCollectionUpsert: vi.fn(),
  productCollectionFindUnique: vi.fn(),
  savePublicUpload: vi.fn(),
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    product: {
      create: mocks.productCreate,
      findUnique: mocks.productFindUnique,
      update: mocks.productUpdate,
      delete: mocks.productDelete,
    },
    productCollection: {
      upsert: mocks.productCollectionUpsert,
      findUnique: mocks.productCollectionFindUnique,
    },
  },
}));

vi.mock("@/src/lib/storage/public-media", () => ({
  savePublicUpload: mocks.savePublicUpload,
}));

function authedRequest(form?: FormData) {
  return {
    headers: {
      get: (key: string) => key.toLowerCase() === "cookie" ? `${OWNER_SESSION_COOKIE}=${encodeURIComponent(createOwnerSessionValue())}` : null,
    },
    formData: () => Promise.resolve(form ?? new FormData()),
  } as unknown as Request;
}

function productForm(overrides: Record<string, string | File> = {}) {
  const form = new FormData();
  form.set("category", "ring");
  form.set("name", "Emerald Ring");
  form.set("description", "Custom ring");
  form.set("image", new File(["img"], "ring.png", { type: "image/png" }));
  form.set("priceMode", "range");
  form.set("priceLabel", "$1,200-$1,800");
  form.set("material", "white_gold");
  form.set("metalDetail", "14K white gold");
  form.set("stoneQuality", "VS diamonds");
  form.set("weightLabel", "18g");
  form.set("status", "published");
  for (const [key, value] of Object.entries(overrides)) form.set(key, value);
  return form;
}

describe("/api/owner/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OWNER_ACCESS_CODE = "test-owner-code";
    mocks.productCollectionUpsert.mockResolvedValue({});
    mocks.productCollectionFindUnique.mockResolvedValue({ id: "collection-ring", slug: "ring" });
    mocks.savePublicUpload.mockResolvedValue("/generated/accounts/demo-account/products/ring.png");
    mocks.productCreate.mockImplementation(({ data }) => Promise.resolve({ id: "product-1", ...data }));
    mocks.productFindUnique.mockResolvedValue({
      id: "product-1",
      accountId: "demo-account",
      imageUrl: "/generated/old.png",
    });
    mocks.productUpdate.mockImplementation(({ data }) => Promise.resolve({ id: "product-1", ...data }));
    mocks.productDelete.mockResolvedValue({});
  });

  it("creates a published product in the matching category collection", async () => {
    const { POST } = await import("../route");

    const response = await POST(authedRequest(productForm()));

    expect(response.status).toBe(201);
    expect(mocks.productCollectionUpsert).toHaveBeenCalledTimes(8);
    expect(mocks.productCollectionFindUnique).toHaveBeenCalledWith({
      where: { accountId_slug: { accountId: "demo-account", slug: "ring" } },
    });
    expect(mocks.productCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accountId: "demo-account",
        collectionId: "collection-ring",
        category: "ring",
        name: "Emerald Ring",
        description: "Custom ring",
        imageUrl: "/generated/accounts/demo-account/products/ring.png",
        priceMode: "range",
        priceLabel: "$1,200-$1,800",
        material: "white_gold",
        metalDetail: "14K white gold",
        stoneQuality: "VS diamonds",
        weightLabel: "18g",
        isActive: true,
      }),
    });
  });

  it("updates an owned product as a draft and keeps its image when no new file is sent", async () => {
    const { PATCH } = await import("../[productId]/route");
    const form = productForm({ status: "draft" });
    form.delete("image");

    const response = await PATCH(authedRequest(form), {
      params: { productId: "product-1" },
    });

    expect(response.status).toBe(200);
    expect(mocks.savePublicUpload).not.toHaveBeenCalled();
    expect(mocks.productUpdate).toHaveBeenCalledWith({
      where: { id: "product-1" },
      data: expect.objectContaining({
        imageUrl: "/generated/old.png",
        isActive: false,
      }),
    });
  });

  it("deletes only products owned by the default account", async () => {
    const { DELETE } = await import("../[productId]/route");

    const response = await DELETE(authedRequest(), {
      params: { productId: "product-1" },
    });

    expect(response.status).toBe(200);
    expect(mocks.productDelete).toHaveBeenCalledWith({ where: { id: "product-1" } });
  });

  it("rejects product creation without owner auth", async () => {
    const { POST } = await import("../route");

    const response = await POST(new Request("http://test.local/api/owner/products", { method: "POST", body: productForm() }));

    expect(response.status).toBe(401);
    expect(mocks.productCreate).not.toHaveBeenCalled();
  });
});
