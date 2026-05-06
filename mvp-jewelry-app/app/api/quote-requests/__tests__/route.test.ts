import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestFindUnique: vi.fn(),
  leadFindFirst: vi.fn(),
  quoteRequestCreate: vi.fn()
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    request: {
      findUnique: mocks.requestFindUnique
    },
    lead: {
      findFirst: mocks.leadFindFirst
    },
    quoteRequest: {
      create: mocks.quoteRequestCreate
    }
  }
}));

const baseRequest = {
  id: "req-test",
  createdAt: new Date("2026-05-05T12:00:00.000Z"),
  productType: "name",
  styleId: "gotti",
  text: "Xavier",
  twoTone: true,
  primaryMetal: "rose_gold",
  secondaryMetal: "white_gold",
  emblem: "moneybag",
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
    mocks.quoteRequestCreate.mockResolvedValue({ id: "quote-test" });
  });

  it("creates a quote request snapshot from the better model image and customer choices", async () => {
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

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ quoteRequestId: "quote-test" });
    expect(mocks.quoteRequestCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requestId: "req-test",
        resultId: "result-1",
        videoId: "video-test",
        designedImageUrl: "/generated/req-test-v1.png",
        videoUrl: "https://cdn.example.com/video.mp4",
        generatedAt: new Date("2026-05-05T12:01:30.000Z"),
        productType: "name",
        styleId: "gotti",
        text: "Xavier",
        twoTone: true,
        primaryMetal: "rose_gold",
        secondaryMetal: "white_gold",
        emblem: "moneybag",
        diamondQuality: "vvs",
        customerName: "Rox",
        customerPhone: "+15555551212",
        customerEmail: "rox@example.com",
        status: "pending"
      })
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

    expect(response.status).toBe(201);
    expect(mocks.quoteRequestCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerName: "Customer",
        customerPhone: "+15555550000",
        customerEmail: "customer@example.com",
        diamondQuality: "vs"
      })
    });
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
    expect(mocks.quoteRequestCreate).not.toHaveBeenCalled();
  });
});
