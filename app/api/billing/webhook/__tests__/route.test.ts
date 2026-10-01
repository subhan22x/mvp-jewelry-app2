import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
const mocks = vi.hoisted(() => ({ retrieve: vi.fn(), sync: vi.fn(), lock: vi.fn(), eventFind: vi.fn(), eventCreate: vi.fn(), accountFind: vi.fn(), transaction: vi.fn() }));
vi.mock("@/src/lib/billing/sync", () => ({ syncStripeSubscription: mocks.sync, stripeId: (v: unknown) => typeof v === "string" ? v : null }));
vi.mock("@/src/lib/billing/checkout", () => ({ lockBillingAccount: mocks.lock }));
vi.mock("@/server/db/client", () => ({ prisma: { account: { findUnique: mocks.accountFind, findFirst: mocks.accountFind }, $transaction: mocks.transaction } }));
const stripe = new Stripe("sk_test_not_a_real_key");
vi.spyOn(stripe.subscriptions, "retrieve").mockImplementation(mocks.retrieve);
vi.mock("@/src/lib/billing/stripe", () => ({ getStripe: () => stripe, requireStripeWebhookSecret: () => "whsec_test_signature" }));
import { POST } from "../route";
function request(type = "customer.subscription.updated", object: unknown = { id: "sub_1", customer: "cus_1", status: "past_due", metadata: { accountId: "acct" } }) {
  const payload = JSON.stringify({ id: "evt_1", type, data: { object } });
  return new Request("https://example.com/api/billing/webhook", { method: "POST", body: payload, headers: { "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_test_signature" }) } });
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.accountFind.mockResolvedValue({ id: "acct" }); mocks.eventFind.mockResolvedValue(null); mocks.retrieve.mockResolvedValue({ id: "sub_1", status: "active" }); mocks.sync.mockResolvedValue("acct");
  mocks.transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn({ stripeWebhookEvent: { findUnique: mocks.eventFind, create: mocks.eventCreate } }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});
describe("signed Stripe webhooks", () => {
  it("uses current Stripe state instead of the stale event payload", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(mocks.sync).toHaveBeenCalledWith(expect.anything(), { id: "sub_1", status: "active" }, "acct");
    expect(mocks.eventCreate).toHaveBeenCalled();
  });
  it("skips duplicate events without applying entitlements again", async () => {
    mocks.eventFind.mockResolvedValue({ stripeEventId: "evt_1" });
    expect(await (await POST(request())).json()).toMatchObject({ processed: false });
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("returns a retryable failure and does not mark a failed sync completed", async () => {
    mocks.sync.mockRejectedValueOnce(new Error("database error"));
    expect((await POST(request())).status).toBe(500);
    expect(mocks.eventCreate).not.toHaveBeenCalled();
    expect((await POST(request())).status).toBe(200);
  });
  it("handles invoice failures and recovery using the linked subscription", async () => {
    for (const type of ["invoice.payment_failed", "invoice.paid"]) {
      expect((await POST(request(type, { customer: "cus_1", parent: { subscription_details: { subscription: "sub_1" } } }))).status).toBe(200);
    }
    expect(mocks.retrieve).toHaveBeenCalledWith("sub_1");
  });
  it("rejects altered bodies signed with the original payload", async () => {
    const original = request();
    const modified = new Request(original.url, { method: "POST", headers: original.headers, body: (await original.text()) + " " });
    expect((await POST(modified)).status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
