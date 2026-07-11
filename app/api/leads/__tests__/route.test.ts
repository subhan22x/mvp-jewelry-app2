import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  leadCreate: vi.fn(),
  requestFindUnique: vi.fn(),
  resolveAccountIdFromSlug: vi.fn(),
  ensureDraftQuoteForRequest: vi.fn()
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    lead: { create: mocks.leadCreate },
    request: { findUnique: mocks.requestFindUnique }
  }
}));

vi.mock("@/src/lib/tenant", () => ({
  resolveAccountIdFromSlug: mocks.resolveAccountIdFromSlug
}));

vi.mock("@/src/lib/quotes/ensure-draft-quote", () => ({
  ensureDraftQuoteForRequest: mocks.ensureDraftQuoteForRequest
}));

describe("/api/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAccountIdFromSlug.mockResolvedValue("account-dev");
    mocks.leadCreate.mockImplementation(async ({ data }) => ({
      id: "lead-test",
      ...data
    }));
  });

  it("does not pass accountSlug, the routing-only field, to Prisma", async () => {
    const { POST } = await import("../route");

    const response = await POST(new Request("http://test.local/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accountSlug: "dev",
        name: "Amna",
        phone: "+1 (324) 234-2343",
        email: "amna@gmail.com"
      })
    }));

    expect(response.status).toBe(201);
    expect(mocks.leadCreate).toHaveBeenCalledWith({
      data: {
        name: "Amna",
        phone: "+1 (324) 234-2343",
        email: "amna@gmail.com",
        accountId: "account-dev"
      }
    });
    expect(await response.json()).toMatchObject({ leadId: "lead-test" });
  });
});
