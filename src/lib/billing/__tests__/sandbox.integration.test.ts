// @vitest-environment node
// Opt-in: real Stripe sandbox requests and a disposable local Postgres database.
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { cli, CliTransport } from "./stripe-cli";

const enabled = process.env.BILLING_SANDBOX_INTEGRATION === "true";
const fixture = vi.hoisted(() => ({ stripe: null as Stripe | null, accountId: "", secret: "whsec_local_integration_only" }));
vi.mock("@/src/lib/billing/stripe", () => ({ getStripe: () => fixture.stripe!, requireStripeWebhookSecret: () => fixture.secret }));
vi.mock("@/src/lib/auth/owner-context", () => ({ getOwnerContext: async () => ({ accountId: fixture.accountId, email: "billing-test@example.invalid" }) }));

import { prisma } from "@/server/db/client";
import { startAccountCheckout } from "../checkout";
import { evaluateAccountEntitlement } from "../entitlements";
import { BILLING_PLANS } from "../plans";
import { POST as webhook } from "@/app/api/billing/webhook/route";
import { GET as status } from "@/app/api/billing/status/route";

describe.skipIf(!enabled)("real Stripe sandbox with local Postgres", () => {
  let stripe: Stripe;
  let clockId: string;
  let customerId: string;
  let priceId: string;
  let subscriptionId: string;
  const runId = randomUUID();

  beforeAll(async () => {
    const database = new URL(process.env.DATABASE_URL!);
    if (!["127.0.0.1", "localhost"].includes(database.hostname) || !database.pathname.includes("billing_test")) throw new Error("Integration tests require a disposable local billing_test database.");
    const identity = await cli(["whoami", "--format", "json"]);
    if (identity.mode !== "test") throw new Error("Switch the CLI to an authorized sandbox before testing.");
    stripe = new Stripe("sk_test_cli_transport", { apiVersion: "2026-09-30.endive", httpClient: new CliTransport(), maxNetworkRetries: 0 });
    fixture.stripe = stripe;
    fixture.accountId = `billing_test_${runId}`;
    const products = await stripe.products.list({ limit: 100, active: true });
    let product = products.data.find(item => item.metadata.integrationFixture === "growjewelry-basic");
    if (!product) product = await stripe.products.create({ name: "Grow Jewelry Basic integration test", metadata: { integrationFixture: "growjewelry-basic" }, default_price_data: { currency: "usd", unit_amount: 25000, recurring: { interval: "month" } } });
    process.env.STRIPE_PRODUCT_BASIC = product.id;
    priceId = typeof product.default_price === "string" ? product.default_price : product.default_price!.id;
    const clock = await stripe.testHelpers.testClocks.create({ frozen_time: Math.floor(Date.now() / 1000), name: `Grow Jewelry integration ${runId.slice(0, 8)}` });
    clockId = clock.id;
    await prisma.account.create({ data: { id: fixture.accountId, name: "Billing integration fixture", slug: `billing-test-${runId}`, subscriptionStatus: "incomplete", subscriptionPlanKey: "basic" } });
    const customer = await stripe.customers.create({ name: "Disposable billing integration customer", test_clock: clock.id, metadata: { accountId: fixture.accountId } });
    customerId = customer.id;
    await prisma.account.update({ where: { id: fixture.accountId }, data: { stripeCustomerId: customerId } });
  }, 60_000);

  afterAll(async () => {
    if (clockId) await stripe.testHelpers.testClocks.del(clockId);
    if (fixture.accountId) {
      await prisma.stripeWebhookEvent.deleteMany({ where: { accountId: fixture.accountId } });
      await prisma.usagePlan.deleteMany({ where: { accountId: fixture.accountId } });
      await prisma.account.deleteMany({ where: { id: fixture.accountId } });
    }
    await prisma.$disconnect();
  }, 60_000);

  async function deliver(type: string, subscription: Stripe.Subscription, eventId = `evt_integration_${randomUUID()}`) {
    const body = JSON.stringify({ id: eventId, object: "event", type, data: { object: subscription } });
    const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret: fixture.secret });
    const response = await webhook(new Request("http://localhost/api/billing/webhook", { method: "POST", body, headers: { "stripe-signature": signature } }));
    expect(response.status).toBe(200);
    return response.json();
  }

  async function snapshot() { return (await prisma.account.findUniqueOrThrow({ where: { id: fixture.accountId } })); }
  async function advance(time: number) {
    await stripe.testHelpers.testClocks.advance(clockId, { frozen_time: time });
    for (let attempt = 0; attempt < 60; attempt++) {
      if ((await stripe.testHelpers.testClocks.retrieve(clockId)).status === "ready") return;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error("Stripe test clock did not finish advancing.");
  }

  it("serializes concurrent checkout clicks, refuses unconfirmed access, and expires superseded sessions", async () => {
    const start = () => startAccountCheckout({ stripe, accountId: fixture.accountId, email: null, plan: BILLING_PLANS[0], intent: "trial", expectedPriceId: priceId, baseUrl: "http://localhost:3108" });
    const urls = await Promise.all([start(), start()]);
    expect(urls[0]).toBe(urls[1]);
    const sessions = await stripe.checkout.sessions.list({ customer: customerId, status: "open" });
    expect(sessions.data).toHaveLength(1);
    const session = sessions.data[0];
    expect(session.payment_method_collection).toBe("always");
    expect(session.success_url).toContain("session_id={CHECKOUT_SESSION_ID}");
    const response = await status(new Request(`http://localhost/api/billing/status?session_id=${session.id}`));
    expect(await response.json()).toMatchObject({ ready: false });
    expect(evaluateAccountEntitlement(await snapshot()).canUsePaidFeatures).toBe(false);
    await stripe.checkout.sessions.expire(session.id);
  }, 60_000);

  it("syncs a card-backed trial atomically and handles duplicate delivery", async () => {
    const method = await stripe.paymentMethods.attach("pm_card_visa", { customer: customerId });
    await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: method.id } });
    const subscription = await stripe.subscriptions.create({ customer: customerId, items: [{ price: priceId }], trial_period_days: 7, default_payment_method: method.id, metadata: { accountId: fixture.accountId } });
    subscriptionId = subscription.id;
    const eventId = `evt_integration_${runId}`;
    expect(await deliver("customer.subscription.created", subscription, eventId)).toMatchObject({ processed: true });
    expect(await deliver("customer.subscription.created", subscription, eventId)).toMatchObject({ processed: false });
    expect(evaluateAccountEntitlement(await snapshot()).isInTrial).toBe(true);
    expect((await snapshot()).hasUsedTrial).toBe(true);
    expect(await prisma.usagePlan.count({ where: { accountId: fixture.accountId, endsAt: null } })).toBe(1);
  }, 60_000);

  it("ends trial, renews, denies failed-payment access after grace, and recovers", async () => {
    let subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await advance(subscription.trial_end! + 3600);
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
    expect(subscription.status).toBe("active");
    await deliver("customer.subscription.updated", subscription);
    expect(evaluateAccountEntitlement(await snapshot()).canUsePaidFeatures).toBe(true);

    const failing = await stripe.paymentMethods.attach("pm_card_chargeCustomerFail", { customer: customerId });
    await stripe.subscriptions.update(subscriptionId, { default_payment_method: failing.id });
    await advance(subscription.items.data[0].current_period_end + 3600);
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
    expect(subscription.status).toBe("past_due");
    await deliver("customer.subscription.updated", subscription);
    const failed = await snapshot();
    expect(evaluateAccountEntitlement(failed).isInPaymentGrace).toBe(true);
    expect(evaluateAccountEntitlement(failed, new Date(failed.billingIssueStartedAt!.getTime() + 2 * 86400000)).canUsePaidFeatures).toBe(false);

    const recovery = await stripe.paymentMethods.attach("pm_card_visa", { customer: customerId });
    await stripe.subscriptions.update(subscriptionId, { default_payment_method: recovery.id });
    await stripe.invoices.pay(typeof subscription.latest_invoice === "string" ? subscription.latest_invoice : subscription.latest_invoice!.id, { payment_method: recovery.id });
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
    expect(subscription.status).toBe("active");
    await deliver("customer.subscription.updated", subscription);
    expect((await snapshot()).billingIssueStartedAt).toBeNull();
    expect(evaluateAccountEntitlement(await snapshot()).canUsePaidFeatures).toBe(true);
  }, 180_000);

  it("keeps access through period-end cancellation and blocks when Stripe cancels", async () => {
    let subscription = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    await deliver("customer.subscription.updated", subscription);
    expect(evaluateAccountEntitlement(await snapshot()).statusLabel).toBe("Cancels at period end");
    await advance(subscription.items.data[0].current_period_end + 3600);
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
    expect(subscription.status).toBe("canceled");
    await deliver("customer.subscription.deleted", subscription);
    expect(evaluateAccountEntitlement(await snapshot()).canPublishStorefront).toBe(false);
    expect(evaluateAccountEntitlement(await snapshot()).canUsePaidFeatures).toBe(false);
  }, 120_000);
});
