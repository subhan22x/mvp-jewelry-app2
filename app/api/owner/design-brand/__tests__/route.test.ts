import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOwnerContext: vi.fn(),
  accountFindUnique: vi.fn(),
  accountUpdate: vi.fn(),
  storeProfileUpsert: vi.fn(),
  savePublicUpload: vi.fn(),
  useDirectPublicUpload: vi.fn()
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    account: {
      findUnique: mocks.accountFindUnique,
      update: mocks.accountUpdate
    },
    storeProfile: {
      upsert: mocks.storeProfileUpsert
    }
  }
}));

vi.mock("@/src/lib/storage/public-media", () => ({
  savePublicUpload: mocks.savePublicUpload,
  useDirectPublicUpload: mocks.useDirectPublicUpload
}));

vi.mock("@/src/lib/auth/owner-context", () => ({
  getOwnerContext: mocks.getOwnerContext
}));

function authedRequest(form: FormData) {
  return {
    formData: () => Promise.resolve(form)
  } as unknown as Request;
}

describe("/api/owner/design-brand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOwnerContext.mockResolvedValue({ accountId: "demo-account", userId: "demo", authUserId: "auth-demo", email: "demo@example.com" });
    mocks.accountFindUnique.mockResolvedValue({
      id: "demo-account",
      name: "Ice House",
      logoUrl: "/account-logo.png",
      StoreProfile: { profileImageUrl: "/profile-logo.png" }
    });
    mocks.accountUpdate.mockResolvedValue({});
    mocks.storeProfileUpsert.mockResolvedValue({});
  });

  it("requires an authenticated owner", async () => {
    mocks.getOwnerContext.mockResolvedValue(null);
    const { PATCH } = await import("../route");

    const response = await PATCH(authedRequest(new FormData()));

    expect(response.status).toBe(401);
  });

  it("saves the selected mode without touching the logo when no file is uploaded", async () => {
    const { PATCH } = await import("../route");
    const form = new FormData();
    form.set("mode", "name");

    const response = await PATCH(authedRequest(form));

    expect(response.status).toBe(200);
    expect(mocks.accountUpdate).toHaveBeenCalledWith({
      where: { id: "demo-account" },
      data: { brandDisplayMode: "name" }
    });
    expect(mocks.storeProfileUpsert).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ mode: "name", logoUrl: "/profile-logo.png" });
  });

  it("rejects logo mode when the account has no logo to show", async () => {
    mocks.accountFindUnique.mockResolvedValue({
      id: "demo-account",
      name: "Ice House",
      logoUrl: null,
      StoreProfile: { profileImageUrl: null }
    });
    const { PATCH } = await import("../route");
    const form = new FormData();
    form.set("mode", "logo");

    const response = await PATCH(authedRequest(form));

    expect(response.status).toBe(400);
    expect(mocks.accountUpdate).not.toHaveBeenCalled();
  });

  it("uploads a new logo and keeps the account and storefront profile in sync", async () => {
    mocks.savePublicUpload.mockResolvedValue("/generated/accounts/demo-account/profile/logo-1.png");
    const { PATCH } = await import("../route");
    const form = new FormData();
    form.set("mode", "logo");
    form.set("logo", new File(["img"], "logo.png", { type: "image/png" }));

    const response = await PATCH(authedRequest(form));

    expect(response.status).toBe(200);
    expect(mocks.accountUpdate).toHaveBeenCalledWith({
      where: { id: "demo-account" },
      data: { brandDisplayMode: "logo", logoUrl: "/generated/accounts/demo-account/profile/logo-1.png" }
    });
    expect(mocks.storeProfileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: "demo-account" },
        update: { profileImageUrl: "/generated/accounts/demo-account/profile/logo-1.png" }
      })
    );
    await expect(response.json()).resolves.toEqual({ mode: "logo", logoUrl: "/generated/accounts/demo-account/profile/logo-1.png" });
  });
});
