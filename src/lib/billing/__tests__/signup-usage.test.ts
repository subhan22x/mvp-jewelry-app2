import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ assert: vi.fn(), reserve: vi.fn(), isSignup: vi.fn(), succeed: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: {} }));
vi.mock("@/src/lib/billing/entitlements", () => ({ assertAccountCanUsePaidFeatures: mock.assert, billingErrorResponse: () => ({ code: "billing_required" }) }));
vi.mock("@/src/lib/billing/signup-credits", () => ({ SIGNUP_GENERATIONS: 5, reserveSignupGeneration: mock.reserve, isSignupGeneration: mock.isSignup, markSignupGenerationSucceeded: mock.succeed }));
import { ensureUsageAvailable, consumeUsageCredit } from "@/src/lib/usage";
beforeEach(() => { vi.clearAllMocks(); mock.assert.mockRejectedValue(new Error("Subscribe")); mock.reserve.mockResolvedValue(true); mock.isSignup.mockReturnValue(true); mock.succeed.mockReturnValue(true); });
describe("signup allowance usage routing", () => {
  it("admits a normal two-image Generate request with one reservation", async () => {
    await expect(ensureUsageAvailable("account", "design_image_generated", 2)).resolves.toMatchObject({ included: 5 });
    expect(mock.reserve).toHaveBeenCalledOnce();
    await consumeUsageCredit({ accountId: "account", kind: "design_image_generated", sourceType: "Result", sourceId: "image" });
    expect(mock.succeed).toHaveBeenCalledWith("account");
  });
  it.each(["design_video_generated", "design_3d_generated", "vvs_product_post_generated", "vvs_video_generated", "quote_responded"] as const)("does not apply signup credits to %s", async kind => {
    await expect(ensureUsageAvailable("account", kind)).rejects.toThrow("Subscribe");
    expect(mock.reserve).not.toHaveBeenCalled();
  });
  it("denies a sixth request before generation", async () => {
    mock.reserve.mockResolvedValue(false);
    await expect(ensureUsageAvailable("account", "design_image_generated", 2)).rejects.toThrow("Subscribe");
  });
});
