import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  userFindUnique: vi.fn(),
  accountFindUnique: vi.fn(),
  accountCreate: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("@/src/lib/supabase/server", () => ({
  createClient: mocks.createClient
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    $transaction: mocks.transaction
  }
}));

vi.mock("@/src/lib/storage/direct-upload", () => ({
  parseDirectUploadReference: vi.fn(() => null)
}));

vi.mock("@/src/lib/storage/public-media", () => ({
  savePublicUpload: vi.fn(),
  useDirectPublicUpload: vi.fn()
}));

function onboardingRequest(payload: unknown) {
  const form = new FormData();
  form.set("payload", JSON.stringify(payload));
  return new Request("http://test.local/api/onboarding", { method: "POST", body: form });
}

describe("/api/onboarding SMS consent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "auth-1", email: "owner@example.com" } },
          error: null
        })
      }
    });
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.accountFindUnique.mockResolvedValue(null);
    mocks.accountCreate.mockResolvedValue({ id: "account-1", slug: "ice-house" });
    mocks.transaction.mockImplementation((callback) => callback({
      account: {
        findUnique: mocks.accountFindUnique,
        create: mocks.accountCreate
      }
    }));
  });

  it("rejects affirmative SMS consent without a phone number", async () => {
    const { POST } = await import("../route");

    const response = await POST(onboardingRequest({
      businessName: "Ice House",
      phone: "",
      smsConsent: true
    }));

    expect(response.status).toBe(400);
    expect(mocks.accountCreate).not.toHaveBeenCalled();
  });

  it("persists the phone and an auditable consent record", async () => {
    const { POST } = await import("../route");

    const response = await POST(onboardingRequest({
      businessName: "Ice House",
      ownerName: "Jordan",
      phone: "+15555550100",
      smsConsent: true
    }));

    expect(response.status).toBe(200);
    expect(mocks.accountCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        StoreProfile: {
          create: expect.objectContaining({
            smsNotificationPhone: "+15555550100",
            smsNotificationsEnabled: true,
            smsConsentAt: expect.any(Date),
            smsConsentSource: "onboarding",
            smsConsentVersion: "2026-09-03",
            smsOptedOutAt: null
          })
        }
      })
    });
  });
});
