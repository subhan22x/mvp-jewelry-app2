import Stripe from "stripe";
import { loadEnvLocal } from "./env-local.mjs";
const env = { ...loadEnvLocal(), ...process.env };
if (!env.STRIPE_SECRET_KEY?.trim()) {
  console.error("STRIPE_SECRET_KEY is missing. Save the app's restricted Stripe key in .env.local or the deployment environment.");
  process.exit(1);
}
try {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY.trim(), { apiVersion: "2026-09-30.endive", timeout: 10000, maxNetworkRetries: 1 });
  if (!env.STRIPE_PRODUCT_BASIC?.trim()) throw new Error("STRIPE_PRODUCT_BASIC is missing.");
  const product = await stripe.products.retrieve(env.STRIPE_PRODUCT_BASIC.trim(), { expand: ["default_price"] });
  if ("deleted" in product || !product.active || !product.default_price) throw new Error("Basic Product is archived or has no default Price.");
  const price = typeof product.default_price === "string" ? await stripe.prices.retrieve(product.default_price) : product.default_price;
  if (!price.active || price.type !== "recurring" || !price.recurring || price.unit_amount === null || price.billing_scheme !== "per_unit" || price.recurring.usage_type !== "licensed") throw new Error("Basic default Price must be an active flat-rate recurring Price.");
  const configuration = env.STRIPE_PORTAL_CONFIGURATION?.trim();
  const portal = configuration ? await stripe.billingPortal.configurations.retrieve(configuration) : null;
  if (portal && !portal.active) throw new Error("The Portal configuration is inactive.");
  console.log(JSON.stringify({
    mode: product.livemode ? "live" : "sandbox",
    basic: { productId: product.id, name: product.name, priceId: price.id, amountInMinorUnits: price.unit_amount, currency: price.currency, interval: price.recurring.interval, intervalCount: price.recurring.interval_count },
    portal: portal ? { id: portal.id, paymentMethods: portal.features.payment_method_update.enabled, invoices: portal.features.invoice_history.enabled, cancellation: portal.features.subscription_cancel.enabled, cancellationMode: portal.features.subscription_cancel.mode } : "uses Stripe default",
    webhookSigningSecretConfigured: Boolean(env.STRIPE_WEBHOOK_SECRET?.trim()),
    note: "Read-only check. No subscription or charge was created. Webhook delivery and payment lifecycle still require testing.",
  }, null, 2));
} catch (error) {
  // Do not print request objects, credentials, or the API response body.
  console.error("Stripe billing check failed:", error instanceof Error ? error.message : "Unknown error");
  process.exit(1);
}
