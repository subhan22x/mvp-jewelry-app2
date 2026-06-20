import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  getOwnerContext: vi.fn(),
  quoteRequestFindFirst: vi.fn(),
  quoteRequestUpdate: vi.fn(),
  consumeUsageCredit: vi.fn(),
  usageErrorResponse: vi.fn()
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    quoteRequest: {
      findFirst: mocks.quoteRequestFindFirst,
      update: mocks.quoteRequestUpdate
    }
  }
}));

vi.mock("@/src/lib/auth/owner-context", () => ({
  getOwnerContext: mocks.getOwnerContext,
}));

vi.mock("@/src/lib/usage", () => ({
  consumeUsageCredit: mocks.consumeUsageCredit,
  usageErrorResponse: mocks.usageErrorResponse,
}));

function authedRequest(body: unknown) {
  return new Request("http://test.local/api/quote-requests/quote-test", {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

describe("/api/quote-requests/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOwnerContext.mockResolvedValue({ accountId: "demo-account", userId: "demo", authUserId: "auth-demo", email: "demo@example.com" });
    mocks.quoteRequestFindFirst.mockResolvedValue({ id: "quote-test", status: "pending", publicToken: null });
    mocks.quoteRequestUpdate.mockResolvedValue({
      id: "quote-test",
      quotedPriceCents: 125000,
      quoteNotes: "Ready in 3 weeks.",
      estimatedDelivery: "3-4 weeks",
      quoteMaterial: "gold",
      quoteMaterialKarat: "14k",
      quoteStoneType: "natural_diamonds",
      status: "sent",
      publicToken: "public-token-test"
    });
    mocks.consumeUsageCredit.mockResolvedValue({ id: "usage-test" });
    mocks.usageErrorResponse.mockReturnValue(null);
  });

  it("rejects unauthenticated quote updates", async () => {
    const { PATCH } = await import("../route");
    mocks.getOwnerContext.mockResolvedValueOnce(null);

    const response = await PATCH(new Request("http://test.local/api/quote-requests/quote-test", {
      method: "PATCH",
      body: JSON.stringify({ status: "sent" })
    }), { params: Promise.resolve({ id: "quote-test" }) });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("unauthorized");
    expect(mocks.quoteRequestUpdate).not.toHaveBeenCalled();
  });

  it("rejects invalid quote update payloads", async () => {
    const { PATCH } = await import("../route");

    const response = await PATCH(authedRequest({
      quotedPriceCents: -1,
      status: "sent"
    }), { params: Promise.resolve({ id: "quote-test" }) });

    expect(response.status).toBe(400);
    expect(mocks.quoteRequestUpdate).not.toHaveBeenCalled();
  });

  it("updates quote price, note, and status", async () => {
    const { PATCH } = await import("../route");

    const response = await PATCH(authedRequest({
      quotedPriceCents: 125000,
      quoteNotes: "Ready in 3 weeks.",
      estimatedDelivery: "3-4 weeks",
      quoteMaterial: "gold",
      quoteMaterialKarat: "14k",
      quoteStoneType: "natural_diamonds",
      status: "sent"
    }), { params: Promise.resolve({ id: "quote-test" }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      id: "quote-test",
      quotedPriceCents: 125000,
      quoteNotes: "Ready in 3 weeks.",
      estimatedDelivery: "3-4 weeks",
      quoteMaterial: "gold",
      quoteMaterialKarat: "14k",
      quoteStoneType: "natural_diamonds",
      status: "sent",
      publicQuoteUrl: "http://test.local/q/public-token-test"
    });
    expect(mocks.quoteRequestUpdate).toHaveBeenCalledWith({
      where: { id: "quote-test" },
      data: expect.objectContaining({
        quotedPriceCents: 125000,
        quoteNotes: "Ready in 3 weeks.",
        estimatedDelivery: "3-4 weeks",
        quoteMaterial: "gold",
        quoteMaterialKarat: "14k",
        quoteStoneType: "natural_diamonds",
        status: "sent",
        publicToken: expect.any(String),
        publicTokenCreatedAt: expect.any(Date)
      })
    });
  });

  it("reuses an existing public quote token", async () => {
    const { PATCH } = await import("../route");
    mocks.quoteRequestFindFirst.mockResolvedValueOnce({ id: "quote-test", status: "sent", publicToken: "existing-token" });
    mocks.quoteRequestUpdate.mockResolvedValueOnce({
      id: "quote-test",
      quotedPriceCents: 150000,
      quoteNotes: "Updated quote.",
      estimatedDelivery: "2 weeks",
      quoteMaterial: "gold",
      quoteMaterialKarat: "18k",
      quoteStoneType: "natural_diamonds",
      status: "sent",
      publicToken: "existing-token"
    });

    const response = await PATCH(authedRequest({
      quotedPriceCents: 150000,
      quoteNotes: "Updated quote.",
      estimatedDelivery: "2 weeks",
      quoteMaterial: "gold",
      quoteMaterialKarat: "18k",
      quoteStoneType: "natural_diamonds",
      status: "sent"
    }), { params: Promise.resolve({ id: "quote-test" }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.publicQuoteUrl).toBe("http://test.local/q/existing-token");
    expect(mocks.quoteRequestUpdate).toHaveBeenCalledWith({
      where: { id: "quote-test" },
      data: expect.not.objectContaining({
        publicToken: expect.any(String),
        publicTokenCreatedAt: expect.any(Date)
      })
    });
  });
});
