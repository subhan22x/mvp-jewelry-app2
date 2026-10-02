import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOwnerContext: vi.fn(),
  accountFindUnique: vi.fn(),
  exceptionCreate: vi.fn(),
  exceptionUpdateMany: vi.fn(),
  exceptionFindMany: vi.fn(),
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    account: { findUnique: mocks.accountFindUnique },
    accountAccessException: { create: mocks.exceptionCreate, updateMany: mocks.exceptionUpdateMany, findMany: mocks.exceptionFindMany },
  },
}));
vi.mock("@/src/lib/auth/owner-context", () => ({ getOwnerContext: mocks.getOwnerContext }));

describe("/api/admin/access-exceptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOwnerContext.mockResolvedValue({ userId: "admin-user", role: "saas_admin" });
    mocks.accountFindUnique.mockResolvedValue({ id: "dev-account", status: "active" });
    mocks.exceptionUpdateMany.mockResolvedValue({ count: 0 });
    mocks.exceptionCreate.mockImplementation(({ data }) => Promise.resolve({ id: "grant-1", createdAt: new Date(), revokedAt: null, ...data }));
  });

  it("records an Account-scoped grant and the authenticated admin as its actor", async () => {
    const { POST } = await import("../route");
    const response = await POST(new Request("http://test.local/api/admin/access-exceptions", {
      method: "POST",
      body: JSON.stringify({ accountId: "dev-account", reason: "Development access", expiresAt: null }),
    }));

    expect(response.status).toBe(201);
    expect(mocks.exceptionCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      accountId: "dev-account", activeAccountId: "dev-account", reason: "Development access", createdByUserId: "admin-user", expiresAt: null,
    }) });
  });

  it("rejects a non-admin even when they have an owner session", async () => {
    const { POST } = await import("../route");
    mocks.getOwnerContext.mockResolvedValueOnce({ userId: "owner-user", role: "store_owner" });
    const response = await POST(new Request("http://test.local/api/admin/access-exceptions", {
      method: "POST", body: JSON.stringify({ accountId: "dev-account", reason: "Not allowed" }),
    }));

    expect(response.status).toBe(403);
    expect(mocks.exceptionCreate).not.toHaveBeenCalled();
  });

  it("rejects an already-expired grant", async () => {
    const { POST } = await import("../route");
    const response = await POST(new Request("http://test.local/api/admin/access-exceptions", {
      method: "POST", body: JSON.stringify({ accountId: "dev-account", reason: "Old grant", expiresAt: "2020-01-01T00:00:00.000Z" }),
    }));

    expect(response.status).toBe(400);
    expect(mocks.exceptionCreate).not.toHaveBeenCalled();
  });
});
