import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  getOwnerContext: vi.fn(),
  quoteRequestFindFirst: vi.fn(),
  quoteRequestUpdate: vi.fn()
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
    mocks.quoteRequestFindFirst.mockResolvedValue({ id: "quote-test" });
    mocks.quoteRequestUpdate.mockResolvedValue({
      id: "quote-test",
      quotedPriceCents: 125000,
      quoteNotes: "Ready in 3 weeks.",
      estimatedDelivery: "3-4 weeks",
      quoteMaterial: "gold",
      quoteMaterialKarat: "14k",
      quoteStoneType: "natural_diamonds",
      status: "sent"
    });
  });

  it("rejects unauthenticated quote updates", async () => {
    const { PATCH } = await import("../route");
    mocks.getOwnerContext.mockResolvedValueOnce(null);

    const response = await PATCH(new Request("http://test.local/api/quote-requests/quote-test", {
      method: "PATCH",
      body: JSON.stringify({ status: "sent" })
    }), { params: { id: "quote-test" } });
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
    }), { params: { id: "quote-test" } });

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
    }), { params: { id: "quote-test" } });
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
      status: "sent"
    });
    expect(mocks.quoteRequestUpdate).toHaveBeenCalledWith({
      where: { id: "quote-test" },
      data: {
        quotedPriceCents: 125000,
        quoteNotes: "Ready in 3 weeks.",
        estimatedDelivery: "3-4 weeks",
        quoteMaterial: "gold",
        quoteMaterialKarat: "14k",
        quoteStoneType: "natural_diamonds",
        status: "sent"
      }
    });
  });
});
