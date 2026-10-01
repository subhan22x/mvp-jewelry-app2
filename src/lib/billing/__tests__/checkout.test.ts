import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
const mocks = vi.hoisted(() => ({ account: vi.fn(), update: vi.fn(), lock: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { $transaction: (fn: (tx: unknown) => unknown) => fn({ account: { findUnique: mocks.account, update: mocks.update }, $executeRaw: mocks.lock }) } }));
import { startAccountCheckout } from "../checkout";
import { BILLING_PLANS } from "../plans";
function list(items: unknown[]) { return (async function* () { yield* items; })(); }
function client() {
  return {
    products: { retrieve: vi.fn().mockResolvedValue({ id: "prod_basic", active: true, name: "Basic", description: null, default_price: { id: "price_basic", product: "prod_basic", active: true, type: "recurring", currency: "usd", unit_amount: 25000, billing_scheme: "per_unit", recurring: { interval: "month", interval_count: 1, usage_type: "licensed" } } }) },
    prices: { retrieve: vi.fn().mockResolvedValue({ active: true, type: "recurring", currency: "usd", unit_amount: 25000, recurring: { interval: "month", interval_count: 1 } }) },
    customers: { create: vi.fn().mockResolvedValue({ id: "cus_1" }) },
    subscriptions: { list: vi.fn().mockImplementation(() => list([])) },
    checkout: { sessions: { list: vi.fn().mockImplementation(() => list([])), expire: vi.fn(), create: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/session" }) } },
    billingPortal: { sessions: { create: vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/portal" }) } },
  };
}
let stripe: ReturnType<typeof client>;
const start = () => startAccountCheckout({ stripe: stripe as unknown as Stripe, accountId: "acct", email: "owner@example.com", plan: BILLING_PLANS[0], expectedPriceId: "price_basic", baseUrl: "https://growjewelry.io" });
beforeEach(() => {
  vi.clearAllMocks(); stripe = client();
  vi.stubEnv("STRIPE_PRODUCT_BASIC", "prod_basic");
  mocks.account.mockResolvedValue({ id: "acct", status: "active", name: "Store", stripeCustomerId: "cus_1", hasUsedTrial: false });
});
describe("Basic Checkout", () => {
  it("collects a payment method and creates a seven-day subscription trial", async () => {
    await start();
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({ mode: "subscription", payment_method_collection: "always", subscription_data: expect.objectContaining({ trial_period_days: 7 }), line_items: [{ price: "price_basic", quantity: 1 }] }), expect.objectContaining({ idempotencyKey: expect.any(String) }));
    expect(mocks.lock).toHaveBeenCalled();
  });
  it.each(["active", "trialing", "past_due", "unpaid", "incomplete", "paused"])("sends existing %s subscribers to the Portal", async status => {
    stripe.subscriptions.list.mockImplementation(() => list([{ status }]));
    expect(await start()).toBe("https://billing.stripe.com/portal");
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
  it("reuses an open Checkout across repeated clicks", async () => {
    stripe.checkout.sessions.list.mockImplementation(() => list([{ mode: "subscription", metadata: { accountId: "acct", priceId: "price_basic", trialEligible: "true" }, url: "https://checkout.stripe.com/existing" }]));
    expect(await start()).toBe("https://checkout.stripe.com/existing");
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
  it("does not repeat a trial when Stripe history precedes the local webhook", async () => {
    stripe.subscriptions.list.mockImplementation(() => list([{ status: "canceled", trial_start: 123 }]));
    await start();
    expect(stripe.checkout.sessions.create.mock.calls[0][0].subscription_data).not.toHaveProperty("trial_period_days");
  });
  it("requires refreshing the page if Stripe changed the displayed price", async () => {
    stripe.products.retrieve.mockResolvedValue({ id: "prod_basic", active: true, name: "Basic", description: null, default_price: { id: "price_new", product: "prod_basic", active: true, type: "recurring", currency: "usd", unit_amount: 30000, billing_scheme: "per_unit", recurring: { interval: "month", interval_count: 1, usage_type: "licensed" } } });
    await expect(start()).rejects.toThrow("price changed");
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
});
