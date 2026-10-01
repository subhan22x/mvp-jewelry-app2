// @vitest-environment node
// Real Checkout, CLI webhook forwarding, and the app's real billing handlers.
// Only owner authentication is replaced by a disposable local fixture.
import { createServer, type Server } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import Stripe from "stripe";
import { cli, CliTransport } from "./stripe-cli";
const fixture = vi.hoisted(() => ({ stripe: null as Stripe | null, accountId: "", secret: "" }));
vi.mock("@/src/lib/billing/stripe", () => ({ getStripe: () => fixture.stripe!, requireStripeWebhookSecret: () => fixture.secret }));
vi.mock("@/src/lib/auth/owner-context", () => ({ getOwnerContext: async () => ({ accountId: fixture.accountId, email: "billing-ui@example.invalid" }) }));
import { prisma } from "@/server/db/client";
import { POST as checkout } from "@/app/api/billing/checkout/route";
import { POST as portal } from "@/app/api/billing/portal/route";
import { POST as webhook } from "@/app/api/billing/webhook/route";
import { GET as status } from "@/app/api/billing/status/route";

describe.skipIf(process.env.BILLING_SANDBOX_UI !== "true")("rendered Stripe sandbox flow", () => {
  const base = "http://localhost:3108";
  const evidence = process.env.BILLING_EVIDENCE_DIR || "/tmp/growjewelry-billing-qa";
  let server: Server;
  let listener: ChildProcess;
  let browser: Browser;
  let page: Page;
  let priceId: string;
  const errors: string[] = [];
  const runId = randomUUID();

  beforeAll(async () => {
    const database = new URL(process.env.DATABASE_URL!);
    if (!["127.0.0.1", "localhost"].includes(database.hostname) || !database.pathname.includes("billing_test")) throw new Error("Use a disposable local billing_test database.");
    if ((await cli(["whoami", "--format", "json"])).mode !== "test") throw new Error("CLI must be in sandbox mode.");
    fixture.stripe = new Stripe("sk_test_cli_transport", { apiVersion: "2026-09-30.endive", httpClient: new CliTransport(), maxNetworkRetries: 0 });
    fixture.accountId = `billing_ui_${runId}`;
    const product = (await fixture.stripe.products.list({ limit: 100 })).data.find(item => item.metadata.integrationFixture === "growjewelry-basic");
    if (!product) throw new Error("Run the sandbox lifecycle integration suite first to provision the test product.");
    process.env.STRIPE_PRODUCT_BASIC = product.id;
    priceId = typeof product.default_price === "string" ? product.default_price : product.default_price!.id;
    const configurations = await fixture.stripe.billingPortal.configurations.list({ limit: 100 });
    const configuration = configurations.data.find(item => item.active && item.business_profile.headline === "Grow Jewelry sandbox billing") ?? await fixture.stripe.billingPortal.configurations.create({
      business_profile: { headline: "Grow Jewelry sandbox billing" },
      features: { invoice_history: { enabled: true }, payment_method_update: { enabled: true }, subscription_cancel: { enabled: true, mode: "at_period_end" } },
    });
    process.env.STRIPE_PORTAL_CONFIGURATION = configuration.id;
    process.env.NEXT_PUBLIC_APP_URL = base;
    await prisma.account.create({ data: { id: fixture.accountId, slug: `billing-ui-${runId}`, name: "Disposable UI test store", subscriptionStatus: "incomplete", subscriptionPlanKey: "basic" } });
    server = createServer(async (req, res) => {
      try {
        const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
        const request = new Request(`http://localhost:3150${req.url}`, { method: req.method, headers: req.headers as Record<string, string>, ...(req.method === "POST" ? { body: Buffer.concat(chunks) } : {}) });
        const path = new URL(request.url).pathname;
        const handler = path.endsWith("/checkout") ? checkout : path.endsWith("/portal") ? portal : path.endsWith("/webhook") ? webhook : status;
        const response = await handler(request);
        const headers: Record<string, string> = {}; response.headers.forEach((value, name) => { headers[name] = value; });
        res.writeHead(response.status, headers); res.end(await response.text());
      } catch { res.writeHead(500); res.end("Billing test bridge failed."); }
    });
    await new Promise<void>(resolve => server.listen(3150, "127.0.0.1", resolve));
    listener = spawn(process.env.STRIPE_CLI_PATH || "stripe", ["listen", "--latest", "--events", "checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed", "--forward-to", "http://localhost:3150/api/billing/webhook"], { stdio: ["ignore", "pipe", "pipe"] });
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Sandbox webhook listener did not start.")), 20_000);
      const collect = (chunk: Buffer) => { const match = chunk.toString().match(/whsec_[A-Za-z0-9]+/); if (match) { fixture.secret = match[0]; clearTimeout(timeout); resolve(); } };
      listener.stdout!.on("data", collect); listener.stderr!.on("data", collect);
    });
    await mkdir(evidence, { recursive: true });
    browser = await chromium.launch({ headless: true, ...(process.env.BILLING_CHROMIUM_PATH ? { executablePath: process.env.BILLING_CHROMIUM_PATH } : {}) });
    page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on("pageerror", error => errors.push(error.message));
    // Render the production billing components through the dev-only preview.
    // API calls go to the actual handlers with real Stripe and Postgres behind them.
    await page.route(`${base}/api/billing/**`, async route => {
      const url = new URL(route.request().url()); url.port = "3150";
      const response = await route.fetch({ url: url.toString() });
      await route.fulfill({ response });
    });
    await page.route(`${base}/owner/account*`, async route => {
      const original = new URL(route.request().url());
      const state = original.searchParams.get("billing") === "success" ? "pending" : "trial";
      const destination = new URL(`${base}/account-preview`);
      destination.searchParams.set("state", state); destination.searchParams.set("price_id", priceId);
      if (original.searchParams.has("session_id")) destination.searchParams.set("session_id", original.searchParams.get("session_id")!);
      const response = await route.fetch({ url: destination.toString() });
      await route.fulfill({ response });
    });
  }, 90_000);

  afterAll(async () => {
    await browser?.close(); listener?.kill("SIGTERM");
    if (server) await new Promise<void>(resolve => server.close(() => resolve()));
    const account = fixture.accountId ? await prisma.account.findUnique({ where: { id: fixture.accountId } }) : null;
    if (account?.stripeCustomerId) await fixture.stripe!.customers.del(account.stripeCustomerId);
    if (fixture.accountId) {
      await prisma.stripeWebhookEvent.deleteMany({ where: { accountId: fixture.accountId } });
      await prisma.usagePlan.deleteMany({ where: { accountId: fixture.accountId } });
      await prisma.account.deleteMany({ where: { id: fixture.accountId } });
    }
    await prisma.$disconnect();
  }, 60_000);

  it("keeps price-change errors inline and completes card-required Checkout through real webhooks", async () => {
    await page.goto(`${base}/account-preview?state=new`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Start free trial", exact: true }).click();
    await expect.poll(() => page.getByRole("alert").filter({ hasText: "plan price changed" }).count(), { timeout: 20_000 }).toBe(1);
    expect(page.url()).toContain("/account-preview");
    await page.screenshot({ path: `${evidence}/desktop-price-change.png`, fullPage: true });
    await page.goto(`${base}/account-preview?state=new&price_id=${priceId}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Start free trial", exact: true }).click();
    await page.waitForURL("https://checkout.stripe.com/**", { timeout: 40_000 });
    await page.getByRole("button", { name: "Start trial", exact: true }).waitFor();
    const card = await page.locator("#payment-method-label-card").boundingBox();
    if (!card) throw new Error("Card payment choice is not visible.");
    await page.mouse.click(card.x + card.width / 2, card.y + card.height / 2);
    await expect.poll(() => page.locator("input").count(), { timeout: 10_000 }).toBeGreaterThan(5);
    await page.screenshot({ path: `${evidence}/stripe-checkout.png`, fullPage: true });
    await page.locator("#cardNumber").fill("4242424242424242");
    await page.locator("#cardExpiry").fill("1234");
    await page.locator("#cardCvc").fill("123");
    await page.locator("#billingName").fill("Billing Sandbox Test");
    await page.locator("#billingPostalCode").fill("94107");
    await page.locator("#enableStripePass").uncheck();
    await page.getByRole("button", { name: "Start trial", exact: true }).click();
    await page.waitForURL(`${base}/owner/account**`, { timeout: 60_000 });
    await expect.poll(async () => (await prisma.account.findUniqueOrThrow({ where: { id: fixture.accountId } })).subscriptionStatus, { timeout: 40_000 }).toBe("trialing");
    await page.getByRole("button", { name: "Manage Basic", exact: true }).waitFor({ timeout: 40_000 });
    await expect.poll(() => new URL(page.url()).searchParams.get("billing"), { timeout: 40_000 }).toBeNull();
    expect(await prisma.stripeWebhookEvent.count({ where: { accountId: fixture.accountId, type: "checkout.session.completed" } })).toBeGreaterThan(0);
    await page.screenshot({ path: `${evidence}/desktop-confirmed.png`, fullPage: true });
    await page.getByRole("button", { name: "Manage Basic", exact: true }).click();
    await page.waitForURL("https://billing.stripe.com/**", { timeout: 40_000 });
    await expect.poll(async () => /payment method/i.test(await page.locator("body").innerText()), { timeout: 20_000 }).toBe(true);
    await page.screenshot({ path: `${evidence}/stripe-portal.png`, fullPage: true });
    await writeFile(`${evidence}/portal-text.txt`, await page.locator("body").innerText());

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`${base}/account-preview?state=past_due&price_id=${priceId}`, { waitUntil: "networkidle" });
    expect(await page.getByRole("button", { name: "Manage Basic", exact: true }).isEnabled()).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: `${evidence}/mobile-recovery.png`, fullPage: true });
    await page.getByRole("button", { name: "Update payment", exact: true }).click();
    await page.waitForURL("https://billing.stripe.com/**", { timeout: 40_000 });
    expect(errors).toEqual([]);
  }, 240_000);
});
