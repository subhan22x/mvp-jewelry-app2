import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestFindUnique: vi.fn(),
  leadFindFirst: vi.fn(),
  leadCreate: vi.fn(),
  quoteRequestUpdateMany: vi.fn(),
  ensureDraftQuote: vi.fn()
}));

vi.mock("@/src/lib/quotes/ensure-draft-quote", () => ({
  ensureDraftQuoteForRequest: mocks.ensureDraftQuote
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    request: {
      findUnique: mocks.requestFindUnique
    },
    lead: {
      findFirst: mocks.leadFindFirst,
      create: mocks.leadCreate
    },
    quoteRequest: {
      updateMany: mocks.quoteRequestUpdateMany
    }
  }
}));

const baseRequest = {
  id: "req-test",
  createdAt: new Date("2026-05-05T12:00:00.000Z"),
  productType: "name",
  pendantFinish: "icedout",
  styleId: "gotti",
  text: "Xavier",
  twoTone: true,
  primaryMetal: "rose_gold",
  secondaryMetal: "white_gold",
  emblem: "moneybag",
  size: "2_3_inches",
  metalType: "gold",
  stoneType: "natural_diamonds",
  plainColor: null,
  plainMetal: null,
  plainKarat: null,
  plainChain: null,
  Results: [
    {
      id: "result-1",
      variant: 1,
      status: "succeeded",
      imageUrl: "/generated/req-test-v1.png",
      completedAt: new Date("2026-05-05T12:01:30.000Z"),
      createdAt: new Date("2026-05-05T12:00:05.000Z")
    },
    {
      id: "result-2",
      variant: 2,
      status: "succeeded",
      imageUrl: "/generated/req-test-v2.png",
      completedAt: new Date("2026-05-05T12:00:45.000Z"),
      createdAt: new Date("2026-05-05T12:00:05.000Z")
    }
  ],
  Videos: [
    {
      id: "video-test",
      status: "succeeded",
      sourceImageUrl: "https://example.com/generated/req-test-v1.png",
      videoUrl: "https://cdn.example.com/video.mp4",
      createdAt: new Date("2026-05-05T12:03:00.000Z")
    }
  ]
};

describe("/api/quote-requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requestFindUnique.mockResolvedValue(baseRequest);
    mocks.leadFindFirst.mockResolvedValue(null);
    mocks.leadCreate.mockResolvedValue({ id: "lead-test" });
    mocks.ensureDraftQuote.mockResolvedValue({ ok: true, quoteRequestId: "quote-test", created: false });
    mocks.quoteRequestUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("reuses the automatic quote draft and updates customer metadata", async () => {
    const { POST } = await import("../route");

    const response = await POST(new Request("http://test.local/api/quote-requests", {
      method: "POST",
      body: JSON.stringify({
        requestId: "req-test",
        videoId: "video-test",
        videoUrl: "https://cdn.example.com/video.mp4",
        diamondQuality: "vvs",
        customerName: "Rox",
        customerPhone: "+15555551212",
        customerEmail: "rox@example.com"
      })
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ quoteRequestId: "quote-test" });
    expect(mocks.ensureDraftQuote).toHaveBeenCalledWith("req-test");
    expect(mocks.quoteRequestUpdateMany).toHaveBeenCalledWith({
      where: { id: "quote-test", status: "pending" },
      data: {
        diamondQuality: "vvs",
        customerName: "Rox",
        customerPhone: "+15555551212",
        customerEmail: "rox@example.com"
      }
    });
  });

  it("falls back to the most recent lead when contact is not sent by the client", async () => {
    const { POST } = await import("../route");
    mocks.leadFindFirst.mockResolvedValue({
      name: "Customer",
      phone: "+15555550000",
      email: "customer@example.com"
    });

    const response = await POST(new Request("http://test.local/api/quote-requests", {
      method: "POST",
      body: JSON.stringify({ requestId: "req-test", diamondQuality: "vs" })
    }));

    expect(response.status).toBe(200);
    expect(mocks.quoteRequestUpdateMany).toHaveBeenCalledWith({
      where: { id: "quote-test", status: "pending" },
      data: {
        customerName: "Customer",
        customerPhone: "+15555550000",
        customerEmail: "customer@example.com",
        diamondQuality: "vs"
      }
    });
  });

  it("does not let the compatibility endpoint mutate a non-pending quote", async () => {
    const { POST } = await import("../route");
    mocks.quoteRequestUpdateMany.mockResolvedValue({ count: 0 });

    const response = await POST(new Request("http://test.local/api/quote-requests", {
      method: "POST",
      body: JSON.stringify({
        requestId: "req-test",
        customerName: "Changed",
        customerPhone: "+15555550001",
        customerEmail: "changed@example.com"
      })
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ quoteRequestId: "quote-test" });
  });

  it("rejects quote requests without customer contact information", async () => {
    const { POST } = await import("../route");

    const response = await POST(new Request("http://test.local/api/quote-requests", {
      method: "POST",
      body: JSON.stringify({ requestId: "req-test" })
    }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/customer contact/i);
    expect(mocks.quoteRequestUpdateMany).not.toHaveBeenCalled();
  });
});
