// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), assign: vi.fn() }));
vi.mock("@/src/lib/auth/platform-admin", () => ({ getPlatformAdminContext: mocks.admin }));
vi.mock("@/src/lib/qr-kits/service", () => ({ assignQrKit: mocks.assign }));
import { POST } from "../route";

const params = { params: Promise.resolve({ qrKitId: "kit-id" }) };
function post(accountId: unknown) {
  return POST(new Request("https://test/api/admin/qr-kits/kit-id/assign", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId })
  }), params);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.admin.mockResolvedValue({ userId: "admin" });
  mocks.assign.mockResolvedValue({ id: "kit-id", account: { id: "account", name: "Store", slug: "store" } });
});

describe("QR assignment API", () => {
  it.each(["a54e71e4-6d65-4e58-a5ad-f3ef8a135e38", "cm123456789012345678901234", "demo-account"])("accepts actual Account ID format %s", async accountId => {
    const response = await post(accountId);
    expect(response.status).toBe(200);
    expect(mocks.assign).toHaveBeenCalledWith({ qrKitId: "kit-id", accountId, actorUserId: "admin" });
    expect(await response.json()).toMatchObject({ kit: { account: { name: "Store", slug: "store" } } });
  });
  it.each(["", "  ", null, 123, "x".repeat(129)])("rejects malformed Account ID %j", async id => {
    expect((await post(id)).status).toBe(400);
    expect(mocks.assign).not.toHaveBeenCalled();
  });
  it("rejects non-admin access before assignment", async () => {
    mocks.admin.mockResolvedValue(null);
    expect((await post("account")).status).toBe(401);
    expect(mocks.assign).not.toHaveBeenCalled();
  });
  it("returns conflicts without reporting success", async () => {
    mocks.assign.mockRejectedValue(new Error("This QR kit is no longer available for assignment."));
    const response = await post("account");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "This QR kit is no longer available for assignment." });
  });
});
