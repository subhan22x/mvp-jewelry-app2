import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(), account: vi.fn(), qr: vi.fn(), directRead: vi.fn(), audience: vi.fn(),
  enqueue: vi.fn(), nudge: vi.fn(), leadCreate: vi.fn(), quoteCreate: vi.fn(), transaction: vi.fn()
}));

vi.mock("@/src/lib/tenant", () => ({ resolvePublicTenantAccess: mocks.access }));
vi.mock("@/server/db/client", () => ({ prisma: { account: { findUnique: mocks.account }, $transaction: mocks.transaction } }));
vi.mock("@/src/lib/qr-kits/service", () => ({ QrKitAttributionError: class extends Error {}, resolveQrKitAttributionFromRequest: mocks.qr }));
vi.mock("@/src/lib/storage/public-media", () => ({ savePublicUpload: vi.fn(), useDirectPublicUpload: (image: { key: string }) => `https://media.example/${image.key}` }));
vi.mock("@/src/lib/storage/direct-upload", () => ({
  parseDirectUploadReference: (value: unknown) => typeof value === "string" ? JSON.parse(value) : null,
  readDirectUpload: mocks.directRead
}));
vi.mock("@/src/lib/notifications/origin", () => ({ requestNotificationAudience: mocks.audience }));
vi.mock("@/src/lib/notifications/events", () => ({ enqueueOwnerNotification: mocks.enqueue, nudgeOwnerNotifications: mocks.nudge }));

const directUpload = JSON.stringify({ key: "incoming/storefront-quote/reference.png", contentType: "image/png", size: 12, originalName: "reference.png" });
const request = () => {
  const form = new FormData();
  form.set("name", "Ava"); form.set("phone", "555-0100"); form.set("email", "ava@example.com");
  form.append("imageUploads", directUpload);
  return new Request("https://example.test/api/storefront/example/quote", { method: "POST", body: form });
};

describe("/api/storefront/[accountSlug]/quote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.access.mockResolvedValue({ status: "ok", tenant: { accountId: "account-1" } });
    mocks.account.mockResolvedValue({ id: "account-1", StoreProfile: { id: "profile-1" } });
    mocks.qr.mockResolvedValue({ qrKitId: null });
    mocks.directRead.mockResolvedValue({ buffer: Buffer.from("png"), contentType: "image/png" });
    mocks.audience.mockResolvedValue("customer");
    mocks.leadCreate.mockResolvedValue({ id: "lead-1" }); mocks.quoteCreate.mockResolvedValue({ id: "quote-1" });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({ lead: { create: mocks.leadCreate }, quoteRequest: { create: mocks.quoteCreate } }));
  });

  it("queues one alert for a customer reference-image quote", async () => {
    const { POST } = await import("../route");
    expect((await POST(request(), { params: Promise.resolve({ accountSlug: "example" }) })).status).toBe(200);
    expect(mocks.enqueue).toHaveBeenCalledWith(expect.anything(), { accountId: "account-1", quoteRequestId: "quote-1", kind: "submitted_quote" });
    expect(mocks.nudge).toHaveBeenCalledOnce();
  });

  it("does not notify an owner submitting through their own storefront", async () => {
    mocks.audience.mockResolvedValue("owner");
    const { POST } = await import("../route");
    expect((await POST(request(), { params: Promise.resolve({ accountSlug: "example" }) })).status).toBe(200);
    expect(mocks.enqueue).not.toHaveBeenCalled();
    expect(mocks.nudge).not.toHaveBeenCalled();
  });

  it("rejects a direct-upload reference that cannot be verified", async () => {
    mocks.directRead.mockRejectedValue(new Error("missing_object"));
    const { POST } = await import("../route");
    const response = await POST(request(), { params: Promise.resolve({ accountSlug: "example" }) });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "One or more uploaded reference images could not be verified." });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
