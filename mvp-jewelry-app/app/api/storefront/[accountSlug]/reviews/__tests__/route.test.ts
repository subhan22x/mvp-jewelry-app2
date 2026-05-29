import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  accountFindUnique: vi.fn(),
  storeReviewCreate: vi.fn(),
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    account: {
      findUnique: mocks.accountFindUnique,
    },
    storeReview: {
      create: mocks.storeReviewCreate,
    },
  },
}));

describe("/api/storefront/[accountSlug]/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.accountFindUnique.mockResolvedValue({ id: "account-1", StoreProfile: { isPublished: true } });
    mocks.storeReviewCreate.mockResolvedValue({ id: "review-1" });
  });

  it("creates a public profile review with at least one contact method", async () => {
    const { POST } = await import("../route");

    const response = await POST(new Request("http://test.local/api/storefront/demo/reviews", {
      method: "POST",
      body: JSON.stringify({
        reviewerName: "Ari",
        reviewerPhone: "",
        reviewerEmail: "ari@example.com",
        reviewerInstagram: "@ari",
        rating: 5,
        reviewText: "Great custom pendant experience.",
      }),
    }), { params: { accountSlug: "demo" } });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ reviewId: "review-1" });
    expect(mocks.storeReviewCreate).toHaveBeenCalledWith({
      data: {
        accountId: "account-1",
        reviewerName: "Ari",
        reviewerPhone: null,
        reviewerEmail: "ari@example.com",
        reviewerInstagram: "ari",
        rating: 5,
        reviewText: "Great custom pendant experience.",
        status: "published",
        source: "public_profile",
      },
    });
  });

  it("rejects reviews without phone, email, or Instagram", async () => {
    const { POST } = await import("../route");

    const response = await POST(new Request("http://test.local/api/storefront/demo/reviews", {
      method: "POST",
      body: JSON.stringify({
        reviewerName: "Ari",
        rating: 5,
        reviewText: "Great custom pendant experience.",
      }),
    }), { params: { accountSlug: "demo" } });

    expect(response.status).toBe(400);
    expect(mocks.storeReviewCreate).not.toHaveBeenCalled();
  });
});
