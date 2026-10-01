import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ owner: vi.fn(), account: vi.fn(), session: vi.fn() }));
vi.mock("@/src/lib/auth/owner-context", () => ({ getOwnerContext: mocks.owner }));
vi.mock("@/server/db/client", () => ({ prisma: { account: { findUnique: mocks.account } } }));
vi.mock("@/src/lib/billing/stripe", () => ({ getStripe: () => ({ checkout: { sessions: { retrieve: mocks.session } } }) }));
import { GET } from "../route";

const account = { id: "acct", status: "active", subscriptionStatus: "active", subscriptionPlanKey: "basic", stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1", trialEndsAt: null, subscriptionCurrentPeriodEnd: null, cancelAtPeriodEnd: false, billingIssueStartedAt: null };
const session = { mode: "subscription", metadata: { accountId: "acct" }, customer: "cus_1", subscription: "sub_1", status: "complete", payment_status: "paid" };
const request = () => new Request("https://growjewelry.io/api/billing/status?session_id=cs_test_123");
beforeEach(() => { vi.clearAllMocks(); mocks.owner.mockResolvedValue({ accountId: "acct" }); mocks.account.mockResolvedValue(account); mocks.session.mockResolvedValue(session); });
describe("Checkout confirmation", () => {
  it("requires authentication", async () => {
    mocks.owner.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(401);
    expect(mocks.session).not.toHaveBeenCalled();
  });
  it("requires webhook-persisted entitlement even when Checkout is complete", async () => {
    mocks.account.mockResolvedValue({ ...account, subscriptionStatus: "incomplete" });
    expect(await (await GET(request())).json()).toMatchObject({ ready: false });
  });
  it("rejects another account's Checkout reference", async () => {
    mocks.session.mockResolvedValue({ ...session, metadata: { accountId: "someone_else" } });
    expect((await GET(request())).status).toBe(404);
  });
  it("rejects a mismatched Stripe customer", async () => {
    mocks.session.mockResolvedValue({ ...session, customer: "cus_other" });
    expect((await GET(request())).status).toBe(404);
  });
  it("does not confirm an old subscription, unpaid Checkout, or an open session", async () => {
    for (const override of [{ subscription: "sub_old" }, { payment_status: "unpaid" }, { status: "open" }]) {
      mocks.session.mockResolvedValue({ ...session, ...override });
      expect(await (await GET(request())).json()).toMatchObject({ ready: false });
    }
  });
  it("confirms a matched, entitled subscription without cacheable account data", async () => {
    const response = await GET(request());
    expect(await response.json()).toEqual({ ready: true, statusLabel: "Active" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
