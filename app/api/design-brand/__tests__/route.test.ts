import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOwnerContext: vi.fn(),
  accountFindUnique: vi.fn()
}));

vi.mock("@/src/lib/auth/owner-context", () => ({
  getOwnerContext: mocks.getOwnerContext
}));

vi.mock("@/server/db/client", () => ({
  prisma: { account: { findUnique: mocks.accountFindUnique } }
}));

describe("/api/design-brand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOwnerContext.mockResolvedValue(null);
  });

  it("returns published storefront branding for a public design route", async () => {
    mocks.accountFindUnique.mockResolvedValue({
      name: "Fallback Store",
      logoUrl: "/account-logo.png",
      status: "active",
      brandDisplayMode: "logo",
      StoreProfile: {
        displayName: "Ice House",
        profileImageUrl: "/profile-logo.png",
        isPublished: true
      }
    });
    const { GET } = await import("../route");

    const response = await GET(new Request("http://test.local/api/design-brand?accountSlug=ice-house"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ displayName: "Ice House", logoUrl: "/profile-logo.png", mode: "logo" });
  });

  it("omits the logo and falls back to name mode when the owner chose the business name", async () => {
    mocks.accountFindUnique.mockResolvedValue({
      name: "Fallback Store",
      logoUrl: "/account-logo.png",
      status: "active",
      brandDisplayMode: "name",
      StoreProfile: {
        displayName: "Ice House",
        profileImageUrl: "/profile-logo.png",
        isPublished: true
      }
    });
    const { GET } = await import("../route");

    const response = await GET(new Request("http://test.local/api/design-brand?accountSlug=ice-house"));

    await expect(response.json()).resolves.toEqual({ displayName: "Ice House", logoUrl: null, mode: "name" });
  });

  it("uses the Flawless wordmark for a SaaS admin", async () => {
    mocks.getOwnerContext.mockResolvedValue({ accountId: "admin-account", role: "saas_admin" });
    const { GET } = await import("../route");

    const response = await GET(new Request("http://test.local/api/design-brand"));

    await expect(response.json()).resolves.toEqual({
      displayName: "Flawless",
      logoUrl: "/landing/flawless-lettering-logo.png",
      mode: "logo"
    });
    expect(mocks.accountFindUnique).not.toHaveBeenCalled();
  });

  it("falls back to the platform wordmark without an active owner", async () => {
    const { GET } = await import("../route");

    const response = await GET(new Request("http://test.local/api/design-brand"));

    await expect(response.json()).resolves.toEqual({
      displayName: "Flawless",
      logoUrl: "/landing/flawless-lettering-logo.png",
      mode: "logo"
    });
  });
});
