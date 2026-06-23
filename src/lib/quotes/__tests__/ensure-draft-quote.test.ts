import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestFindUnique: vi.fn(),
  leadFindFirst: vi.fn(),
  quoteRequestFindFirst: vi.fn(),
  quoteRequestCreate: vi.fn(),
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    request: { findUnique: mocks.requestFindUnique },
    lead: { findFirst: mocks.leadFindFirst },
    quoteRequest: {
      findFirst: mocks.quoteRequestFindFirst,
      create: mocks.quoteRequestCreate,
    },
  },
}));

import { ensureDraftQuoteForRequest } from "../ensure-draft-quote";

const SUCCEEDED_RESULT = {
  id: "res-1",
  variant: 1,
  status: "succeeded",
  imageUrl: "/generated/ava.png",
  completedAt: new Date("2026-06-02T00:00:00Z"),
  createdAt: new Date("2026-06-01T00:00:00Z"),
};

const ELIGIBLE_REQUEST = {
  id: "req-1",
  accountId: "acct-1",
  createdAt: new Date("2026-06-01T00:00:00Z"),
  productType: "name",
  pendantFinish: "icedout",
  styleId: "lexy",
  text: "AVA",
  twoTone: false,
  primaryMetal: "yellow_gold",
  secondaryMetal: null,
  emblem: "none",
  size: null,
  metalType: null,
  stoneType: null,
  diamondQuality: "vvs",
  plainColor: null,
  plainMetal: null,
  plainKarat: null,
  plainChain: null,
  Results: [SUCCEEDED_RESULT],
};

const ELIGIBLE_LEAD = {
  id: "lead-1",
  name: "Ava",
  phone: "555-1234",
  email: "ava@example.com",
};

describe("ensureDraftQuoteForRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requestFindUnique.mockResolvedValue(ELIGIBLE_REQUEST);
    mocks.leadFindFirst.mockResolvedValue(ELIGIBLE_LEAD);
    mocks.quoteRequestFindFirst.mockResolvedValue(null);
    mocks.quoteRequestCreate.mockResolvedValue({ id: "quote-1" });
  });

  it("returns request_not_found when the request is missing", async () => {
    mocks.requestFindUnique.mockResolvedValue(null);

    const result = await ensureDraftQuoteForRequest("missing-req");

    expect(result).toEqual({ ok: false, reason: "request_not_found" });
    expect(mocks.leadFindFirst).not.toHaveBeenCalled();
    expect(mocks.quoteRequestCreate).not.toHaveBeenCalled();
  });

  it("returns not_eligible when the request has no succeeded result", async () => {
    mocks.requestFindUnique.mockResolvedValue({
      ...ELIGIBLE_REQUEST,
      Results: [{ ...SUCCEEDED_RESULT, id: "res-pending", status: "pending" }],
    });

    const result = await ensureDraftQuoteForRequest("req-1");

    expect(result).toEqual({ ok: false, reason: "not_eligible" });
    expect(mocks.leadFindFirst).not.toHaveBeenCalled();
    expect(mocks.quoteRequestCreate).not.toHaveBeenCalled();
  });

  it("returns not_eligible when succeeded results have no image", async () => {
    mocks.requestFindUnique.mockResolvedValue({
      ...ELIGIBLE_REQUEST,
      Results: [{ ...SUCCEEDED_RESULT, imageUrl: null }],
    });

    const result = await ensureDraftQuoteForRequest("req-1");

    expect(result).toEqual({ ok: false, reason: "not_eligible" });
    expect(mocks.quoteRequestCreate).not.toHaveBeenCalled();
  });

  it("returns not_eligible when no lead with nonempty contact exists", async () => {
    mocks.leadFindFirst.mockResolvedValue(null);

    const result = await ensureDraftQuoteForRequest("req-1");

    expect(result).toEqual({ ok: false, reason: "not_eligible" });
    expect(mocks.quoteRequestCreate).not.toHaveBeenCalled();
  });

  it("creates a draft quote and returns created: true", async () => {
    const result = await ensureDraftQuoteForRequest("req-1");

    expect(result).toEqual({ ok: true, quoteRequestId: "quote-1", created: true });
    expect(mocks.quoteRequestCreate).toHaveBeenCalledOnce();
    const data = mocks.quoteRequestCreate.mock.calls[0][0].data;
    expect(data).toMatchObject({
      accountId: "acct-1",
      requestId: "req-1",
      resultId: "res-1",
      customerName: "Ava",
      customerPhone: "555-1234",
      customerEmail: "ava@example.com",
      diamondQuality: "vvs",
      previewMediaType: "image",
      status: "pending",
    });
  });

  it("prefers the variant 1 succeeded result with an image", async () => {
    mocks.requestFindUnique.mockResolvedValue({
      ...ELIGIBLE_REQUEST,
      Results: [
        { ...SUCCEEDED_RESULT, id: "res-2", variant: 2, imageUrl: "/generated/two.png" },
        { ...SUCCEEDED_RESULT, id: "res-1", variant: 1, imageUrl: "/generated/one.png" },
      ],
    });

    await ensureDraftQuoteForRequest("req-1");

    const data = mocks.quoteRequestCreate.mock.calls[0][0].data;
    expect(data.resultId).toBe("res-1");
    expect(data.designedImageUrl).toBe("/generated/one.png");
  });

  it("returns the existing quote idempotently without creating", async () => {
    mocks.quoteRequestFindFirst.mockResolvedValue({ id: "quote-existing" });

    const result = await ensureDraftQuoteForRequest("req-1");

    expect(result).toEqual({ ok: true, quoteRequestId: "quote-existing", created: false });
    expect(mocks.quoteRequestCreate).not.toHaveBeenCalled();
  });
});
