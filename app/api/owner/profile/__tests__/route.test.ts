import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOwnerSessionValue, OWNER_SESSION_COOKIE } from "@/src/lib/owner-auth";

const mocks = vi.hoisted(() => ({
  accountFindUnique: vi.fn(),
  accountUpdate: vi.fn(),
  storeProfileUpsert: vi.fn(),
  savePublicUpload: vi.fn(),
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    account: {
      findUnique: mocks.accountFindUnique,
      update: mocks.accountUpdate,
    },
    storeProfile: {
      upsert: mocks.storeProfileUpsert,
    },
  },
}));

vi.mock("@/src/lib/storage/public-media", () => ({
  savePublicUpload: mocks.savePublicUpload,
}));

function authedRequest(form: FormData) {
  return {
    headers: {
      get: (key: string) => key.toLowerCase() === "cookie" ? `${OWNER_SESSION_COOKIE}=${encodeURIComponent(createOwnerSessionValue())}` : null,
    },
    formData: () => Promise.resolve(form),
  } as unknown as Request;
}

describe("/api/owner/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OWNER_ACCESS_CODE = "test-owner-code";
    mocks.accountFindUnique.mockResolvedValue({
      id: "demo-account",
      name: "Ice King",
      StoreProfile: {
        displayName: "Ice King",
        profileImageUrl: "/old-profile.png",
      },
    });
    mocks.savePublicUpload.mockResolvedValue("/generated/accounts/demo-account/profile/profile.png");
    mocks.storeProfileUpsert.mockImplementation(({ update }) => Promise.resolve({ id: "profile-1", ...update }));
  });

  it("updates public profile links and saves a new profile image", async () => {
    const { PATCH } = await import("../route");
    const form = new FormData();
    form.set("profileImage", new File(["img"], "profile.png", { type: "image/png" }));
    form.set("instagramHandle", "@iceking");
    form.set("phone", "+1 (555) 111-2222");
    form.set("websiteUrl", "iceking.example");
    form.set("extraLink1Label", "Financing");
    form.set("extraLink1Url", "pay.example");
    form.set("extraLink2Label", "Reviews");
    form.set("extraLink2Url", "https://reviews.example");

    const response = await PATCH(authedRequest(form));

    expect(response.status).toBe(200);
    expect(mocks.savePublicUpload).toHaveBeenCalledWith(expect.any(File), "accounts/demo-account/profile", expect.stringMatching(/^profile-/));
    expect(mocks.storeProfileUpsert).toHaveBeenCalledWith({
      where: { accountId: "demo-account" },
      update: expect.objectContaining({
        instagramHandle: "iceking",
        phone: "+1 (555) 111-2222",
        whatsappPhone: "+1 (555) 111-2222",
        websiteUrl: "https://iceking.example",
        profileImageUrl: "/generated/accounts/demo-account/profile/profile.png",
        extraLinksJson: JSON.stringify([
          { label: "Financing", url: "https://pay.example" },
          { label: "Reviews", url: "https://reviews.example" },
        ]),
      }),
      create: expect.objectContaining({ accountId: "demo-account" }),
    });
    expect(mocks.accountUpdate).toHaveBeenCalledWith({
      where: { id: "demo-account" },
      data: { logoUrl: "/generated/accounts/demo-account/profile/profile.png" },
    });
  });

  it("rejects unauthenticated profile updates", async () => {
    const { PATCH } = await import("../route");

    const response = await PATCH(new Request("http://test.local/api/owner/profile", { method: "PATCH", body: new FormData() }));

    expect(response.status).toBe(401);
    expect(mocks.storeProfileUpsert).not.toHaveBeenCalled();
  });
});
