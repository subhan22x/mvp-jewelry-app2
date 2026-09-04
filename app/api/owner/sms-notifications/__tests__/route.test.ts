import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOwnerContext: vi.fn(),
  accountFindUnique: vi.fn(),
  storeProfileUpsert: vi.fn()
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    account: { findUnique: mocks.accountFindUnique },
    storeProfile: { upsert: mocks.storeProfileUpsert }
  }
}));

vi.mock("@/src/lib/auth/owner-context", () => ({
  getOwnerContext: mocks.getOwnerContext
}));

const existingProfile = {
  smsNotificationPhone: "+15555550100",
  smsNotificationsEnabled: true,
  smsConsentAt: new Date("2026-09-03T12:00:00.000Z"),
  smsConsentSource: "onboarding",
  smsConsentVersion: "2026-09-03",
  smsOptedOutAt: null
};

function post(body: unknown) {
  return new Request("http://test.local/api/owner/sms-notifications", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("/api/owner/sms-notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOwnerContext.mockResolvedValue({ accountId: "account-1" });
    mocks.accountFindUnique.mockResolvedValue({ id: "account-1", name: "Ice House", StoreProfile: existingProfile });
    mocks.storeProfileUpsert.mockImplementation(({ update }) => Promise.resolve({ ...existingProfile, ...update }));
  });

  it("requires an authenticated owner", async () => {
    mocks.getOwnerContext.mockResolvedValue(null);
    const { POST } = await import("../route");

    const response = await POST(post({ phone: "+15555550101", enabled: true }));

    expect(response.status).toBe(401);
    expect(mocks.storeProfileUpsert).not.toHaveBeenCalled();
  });

  it("requires a phone number when notifications are enabled", async () => {
    mocks.accountFindUnique.mockResolvedValue({ id: "account-1", name: "Ice House", StoreProfile: null });
    const { POST } = await import("../route");

    const response = await POST(post({ phone: "", enabled: true }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Enter a phone number to enable text notifications." });
  });

  it("records fresh consent when enabling a changed phone", async () => {
    const { POST } = await import("../route");

    const response = await POST(post({ phone: "+15555550101", enabled: true }));

    expect(response.status).toBe(200);
    expect(mocks.storeProfileUpsert).toHaveBeenCalledWith({
      where: { accountId: "account-1" },
      update: expect.objectContaining({
        smsNotificationPhone: "+15555550101",
        smsNotificationsEnabled: true,
        smsConsentAt: expect.any(Date),
        smsConsentSource: "settings",
        smsConsentVersion: "2026-09-03",
        smsOptedOutAt: null
      }),
      create: expect.objectContaining({ accountId: "account-1", displayName: "Ice House" })
    });
  });

  it("records opt-out without deleting the prior consent audit", async () => {
    const { POST } = await import("../route");

    const response = await POST(post({ enabled: false }));

    expect(response.status).toBe(200);
    expect(mocks.storeProfileUpsert).toHaveBeenCalledWith({
      where: { accountId: "account-1" },
      update: {
        smsNotificationPhone: "+15555550100",
        smsNotificationsEnabled: false,
        smsOptedOutAt: expect.any(Date)
      },
      create: expect.objectContaining({ accountId: "account-1" })
    });
  });

  it("returns the persisted settings", async () => {
    const { GET } = await import("../route");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      smsNotificationPhone: "+15555550100",
      smsNotificationsEnabled: true,
      smsConsentAt: "2026-09-03T12:00:00.000Z",
      smsConsentSource: "onboarding",
      smsConsentVersion: "2026-09-03",
      smsOptedOutAt: null
    });
  });
});
