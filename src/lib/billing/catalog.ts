import type Stripe from "stripe";
import { priceIdForPlan, productIdForPlan, type BillingPlan } from "./plans";

export type BillingOffer = {
  priceId: string;
  productId: string;
  label: string;
  description: string;
  formattedPrice: string;
  intervalLabel: string;
};

function id(value: string | { id: string }) { return typeof value === "string" ? value : value.id; }

export async function getBillingOffer(stripe: Stripe, plan: BillingPlan): Promise<BillingOffer> {
  let productId = productIdForPlan(plan);
  const legacyPriceId = priceIdForPlan(plan);
  if (!productId && legacyPriceId) {
    // Transition existing deployments to product-based configuration.
    productId = id((await stripe.prices.retrieve(legacyPriceId)).product);
  }
  if (!productId) throw new Error(`${plan.productEnvVar} is not configured.`);

  const product = await stripe.products.retrieve(productId, { expand: ["default_price"] });
  if ("deleted" in product || !product.active || !product.default_price) {
    throw new Error("This subscription product is unavailable.");
  }
  const price = typeof product.default_price === "string"
    ? await stripe.prices.retrieve(product.default_price)
    : product.default_price;
  if (!price.active || price.type !== "recurring" || !price.recurring ||
      price.billing_scheme !== "per_unit" || price.recurring.usage_type !== "licensed" ||
      price.unit_amount === null || id(price.product) !== productId) {
    throw new Error("This plan requires an active flat-rate recurring Stripe Price.");
  }
  return formatOffer(price, product, plan);
}

// Archived prices can remain attached to existing subscriptions. Never replace
// the customer's own recurring price with the product's new signup price.
export async function getExistingBillingOffer(stripe: Stripe, plan: BillingPlan, priceId: string): Promise<BillingOffer> {
  const price = await stripe.prices.retrieve(priceId);
  if (price.type !== "recurring" || !price.recurring || price.unit_amount === null ||
      price.billing_scheme !== "per_unit" || price.recurring.usage_type !== "licensed") {
    throw new Error("This subscription price cannot be displayed.");
  }
  const product = await stripe.products.retrieve(id(price.product));
  if ("deleted" in product) throw new Error("Subscription product unavailable.");
  return formatOffer(price, product, plan);
}

function formatOffer(price: Stripe.Price, product: Stripe.Product, plan: BillingPlan): BillingOffer {
  // ISO currency exponents match our supported flat-rate currencies. Stripe's
  // legacy ISK/UGX representations use two decimal places despite ISO zero.
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency.toUpperCase(), maximumFractionDigits: 2 });
  const digits = ["isk", "ugx"].includes(price.currency) ? 2 : new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const count = price.recurring!.interval_count;
  const interval = price.recurring!.interval;
  return {
    priceId: price.id,
    productId: product.id,
    label: product.name,
    description: product.description ?? plan.description,
    formattedPrice: formatter.format(price.unit_amount! / 10 ** digits),
    intervalLabel: count === 1 ? `/${interval}` : `/every ${count} ${interval}s`,
  };
}
