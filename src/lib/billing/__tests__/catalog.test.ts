import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { getBillingOffer, getExistingBillingOffer } from "../catalog";
import { BILLING_PLANS } from "../plans";
const product = { id: "prod_basic", name: "Basic", active: true, description: "Store subscription", default_price: {
  id: "price_250", product: "prod_basic", active: true, type: "recurring", currency: "usd", unit_amount: 25000,
  billing_scheme: "per_unit", recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
} };
const retrieve = vi.fn();
const prices = vi.fn();
const stripe = { products: { retrieve }, prices: { retrieve: prices } } as unknown as Stripe;
beforeEach(() => { vi.stubEnv("STRIPE_PRODUCT_BASIC", "prod_basic"); retrieve.mockResolvedValue(product); });
describe("Stripe catalog is authoritative", () => {
  it("keeps an existing subscriber's archived price when the signup price changes", async () => {
    prices.mockResolvedValue({ ...product.default_price, active: false });
    retrieve.mockResolvedValue({ ...product, default_price: { ...product.default_price, id: "price_new", unit_amount: 30000 } });
    expect(await getExistingBillingOffer(stripe, BILLING_PLANS[0], "price_250")).toMatchObject({ priceId: "price_250", formattedPrice: "$250.00" });
    expect(await getBillingOffer(stripe, BILLING_PLANS[0])).toMatchObject({ priceId: "price_new", formattedPrice: "$300.00" });
  });
  it("displays Stripe's product name, description, price and interval", async () => {
    expect(await getBillingOffer(stripe, BILLING_PLANS[0])).toMatchObject({ label: "Basic", description: "Store subscription", formattedPrice: "$250.00", intervalLabel: "/month", priceId: "price_250" });
  });
  it("follows a new default Price without changing app configuration", async () => {
    retrieve.mockResolvedValue({ ...product, default_price: { ...product.default_price, id: "price_300", unit_amount: 30000, recurring: { ...product.default_price.recurring, interval: "year" } } });
    expect(await getBillingOffer(stripe, BILLING_PLANS[0])).toMatchObject({ formattedPrice: "$300.00", intervalLabel: "/year", priceId: "price_300" });
  });
  it("does not advertise archived products", async () => {
    retrieve.mockResolvedValue({ ...product, active: false });
    await expect(getBillingOffer(stripe, BILLING_PLANS[0])).rejects.toThrow("unavailable");
  });
  it("does not substitute a hardcoded price if Stripe has no default", async () => {
    retrieve.mockResolvedValue({ ...product, default_price: null });
    await expect(getBillingOffer(stripe, BILLING_PLANS[0])).rejects.toThrow("unavailable");
  });
});
