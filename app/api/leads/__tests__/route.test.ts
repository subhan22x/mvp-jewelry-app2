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

vi.mock("@/src/lib/tenant", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/src/lib/tenant")>(),
  resolveAccountIdFromSlug: mocks.resolveAccountIdFromSlug
}));

vi.mock("@/src/lib/quotes/ensure-draft-quote", () => ({
  ensureDraftQuoteForRequest: mocks.ensureDraftQuoteForRequest
}));

describe("/api/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAccountIdFromSlug.mockResolvedValue("account-dev");
    mocks.ensureDraftQuoteForRequest.mockResolvedValue({ ok: true, quoteRequestId: "quote-test", created: true });
    mocks.leadCreate.mockImplementation(async ({ data }) => ({
      id: "lead-test",
      ...data
    }));
  });

  it("keeps contact and the automatic quote tied to the original anonymous Request Account", async () => {
    const { POST } = await import("../route");
    mocks.requestFindUnique.mockResolvedValue({ accountId: "admin-account", qrKitId: null });
    // The visitor may have logged in after starting the anonymous generation.
    mocks.resolveAccountIdFromSlug.mockResolvedValue("visitor-account");
    const response = await POST(new Request("http://test.local/api/leads", {
      method: "POST",
      body: JSON.stringify({ requestId: "anonymous-request", name: "Ava", phone: "+15555550123", email: "ava@example.com" })
    }));
    expect(response.status).toBe(201);
    expect(mocks.leadCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ accountId: "admin-account", requestId: "anonymous-request" }) });
    expect(mocks.resolveAccountIdFromSlug).not.toHaveBeenCalled();
    expect(mocks.ensureDraftQuoteForRequest).toHaveBeenCalledWith("anonymous-request");
  });

  it("returns 403 and writes no lead when an unscoped login has no active Account", async () => {
    const { POST } = await import("../route");
    const { PublicTenantAccessError } = await import("@/src/lib/tenant");
    mocks.resolveAccountIdFromSlug.mockRejectedValue(new PublicTenantAccessError("access_denied", "Your login has no active Account."));
    const response = await POST(new Request("http://test.local/api/leads", {
      method: "POST",
      body: JSON.stringify({ name: "Ava", phone: "+15555550123", email: "ava@example.com" })
    }));
    expect(response.status).toBe(403);
    expect(mocks.leadCreate).not.toHaveBeenCalled();
    expect(mocks.ensureDraftQuoteForRequest).not.toHaveBeenCalled();
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
        accountId: "account-dev",
        qrKitId: null
      }
    });
    expect(await response.json()).toMatchObject({ leadId: "lead-test" });
  });
});
