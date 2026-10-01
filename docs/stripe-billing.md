# Stripe subscription billing

Stripe owns the product catalog, prices, customers, subscriptions, invoices, and payment methods. The app owns account authorization, usage policy, and the two-day payment-failure grace period. Account fields are a synchronized snapshot, not an independently editable billing record.

## Initial production configuration

Basic starts at USD 250/month with a seven-day card-required trial. Value and Bundle remain unavailable. The existing $200 quote and $50 Studio products are preserved and are not attached to Basic automatically.

Configured on September 30, 2026:

- Basic Product: `prod_VMHSyBMimxtTTT`
- Initial default Price: `price_1ULYtuP99svhQqLVvuWA2kVE`
- Portal configuration: `bpc_1ULYwrP99svhQqLVohuKln32`
- Webhook endpoint: `we_1ULYyuP99svhQqLVO5QfR3dm`
- Webhook URL: `https://growjewelry.io/api/billing/webhook`
- SDK/webhook API version: `2026-09-30.endive`

The webhook was created disabled. Enable it only after deploying this implementation and verifying the server credentials and database schema. No customer subscriptions or charges were created during setup.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Long-lived server API key; prefer a restricted key. CLI authentication does not supply this to the app. |
| `STRIPE_PRODUCT_BASIC` | Stable Basic Product ID. The app retrieves its current default Price. |
| `STRIPE_PORTAL_CONFIGURATION` | Portal configuration with payment-method updates, invoice history, and cancellation at period end. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this exact webhook endpoint. |
| `STRIPE_TRIAL_DAYS` | Trial duration, default 7. |
| `NEXT_PUBLIC_APP_URL` / `APP_BASE_URL` | Canonical return URL; production uses `https://growjewelry.io`. |

For sandbox testing, use the sandbox's own key, Product, Portal configuration, and webhook signing secret. Never mix live objects and sandbox credentials. Do not put live credentials in Preview environments by default.

Restricted-key permissions needed by the application:

- Read Products, Prices, and Subscriptions.
- Read/write Customers, Checkout Sessions, and Customer Portal sessions.
- No payout, refund, or balance permissions are needed by this implementation.

Use `.env.local` for local secrets and Vercel Production environment variables for deployment. Never commit keys or signing secrets. Configuring variables does not update already-running Vercel deployments; deploy again.

## Changing prices in Stripe

1. Open the Basic Product in Stripe Dashboard.
2. Create a new flat-rate recurring Price for the new amount or interval. Stripe Price amounts are immutable.
3. Set it as the Product's default Price.
4. The Account page and new Checkout sessions read the new default on their next request. No code change or deployment is required.

If a price changes between displaying the Account page and clicking Subscribe, Checkout asks the owner to refresh rather than silently charging a different price. Open app-created Checkout sessions with obsolete pricing are expired when a new Checkout is requested.

Existing subscriptions retain their original Price, and their account page displays that recurring price rather than the new signup price. They continue to map to Basic using the Product ID, even after its default Price changes or the old Price is archived. Updating existing customers' subscription prices is a separate deliberate Stripe action; decide whether to grandfather them or migrate them, and decide proration before changing existing subscriptions.

Product names and descriptions on the plan card also come from Stripe. Usage limits and feature enforcement remain in `src/lib/billing/plans.ts` until product policy changes. Do not infer feature authorization from a marketing description.

Legacy `STRIPE_PRICE_BASIC` configuration remains accepted as a fallback to locate a Product. Prefer `STRIPE_PRODUCT_BASIC` for all new deployments.

## Subscription lifecycle

- Checkout uses subscription mode, collects a payment method, and offers the first trial only.
- Account-scoped Postgres transaction locks serialize Checkout creation and webhook synchronization across instances.
- Existing nonterminal subscriptions go to the Portal instead of creating another subscription. Open app Checkout sessions are reused.
- Stripe subscription history also prevents repeat trials when local webhook delivery is delayed.
- Webhook signatures are verified against the raw request body.
- Subscription state is retrieved from Stripe under the account lock instead of applying potentially stale event snapshots.
- Entitlement changes and the webhook completion record commit in one database transaction. Failures return HTTP 500 for Stripe retry.
- Renewal dates come from `subscription.items.data[0].current_period_end`.
- Older canceled-subscription events cannot overwrite a replacement subscription.
- Unrecognized subscription Products cannot provision access.
- Invoice failures/recovery and subscription status events synchronize the same subscription snapshot.
- Active subscriptions and unexpired trials allow paid features. `past_due`/`unpaid` have the existing two-day grace period. Canceled, paused, incomplete, and expired trials are blocked.
- Billing, profile, and settings remain reachable for account recovery; inactive accounts see a billing gate on other owner screens.
- Existing legacy active accounts without any subscription state retain their pre-existing allowance, as explicitly confirmed by the product owner. New onboarding creates `incomplete`, not a legacy allowance, and sends the owner to the account page to start billing.
- Billing forms show pending and inline error states; expired logins return to sign-in, and native forms return to the account page instead of a raw JSON error view.
- Checkout returns with its session reference. The account page polls an authenticated status endpoint and refreshes after the matching subscription is synchronized. The return URL never provisions access. Confirmation retries are bounded and expose a manual retry if delivery is delayed.

Subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.paused`
- `customer.subscription.resumed`
- `customer.subscription.trial_will_end`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_action_required`

Trial reminders and payment-recovery emails can be configured in Stripe Dashboard. The app synchronizes trial state but does not send its own trial-reminder emails.

## Verification and launch

Run `npm run billing:check` to verify the configured catalog with the app's own API key. It only reads Stripe and does not create a subscription or charge.

Verified in this worktree: 282 regular tests, four opt-in sandbox lifecycle integration tests, and the opt-in browser integration test pass. Lifecycle tests use real Stripe sandbox APIs and a disposable local Postgres database: concurrent Checkout, trial, renewal, failed-payment grace, recovery, duplicate delivery, and cancellation. The browser test completes hosted Checkout with a test card, forwards real signed Stripe webhooks into the actual billing handler, checks persisted access and the confirmation refresh, opens the actual billing portal, and exercises mobile payment recovery. Owner authentication is replaced by a local fixture for this integration test; real production sign-in is not exercised by that harness.

Production database billing columns, uniqueness constraints, and advisory locks were verified through the Supabase connector and an actual read-only Prisma transaction. The app's runtime key passed live customer, Checkout, subscription-read, and Portal permission checks using one temporary customer and an uncompleted Checkout; both were cleaned up. All four billing environment variables are saved to Vercel Production. No real subscription or charge was created during verification. The production webhook remains disabled pending deployment.

To repeat the opt-in tests, authorize a Stripe sandbox in the CLI and switch to it. Set `DATABASE_URL` and `DIRECT_URL` to a disposable local database named `billing_test`, and apply the Prisma schema there. The suites refuse nonlocal database URLs. Set `STRIPE_CLI_PATH` if the CLI is not on PATH. Run:

```sh
BILLING_SANDBOX_INTEGRATION=true npx vitest run src/lib/billing/__tests__/sandbox.integration.test.ts
# Start npm run dev -- --port 3108 before the browser suite.
BILLING_SANDBOX_UI=true npx vitest run src/lib/billing/__tests__/sandbox-ui.integration.test.ts
```

The browser suite uses installed Playwright Chromium; set `BILLING_CHROMIUM_PATH` for a system Chromium. Evidence is saved outside the repository under `/tmp/growjewelry-billing-qa` by default. Sandbox product and Portal fixtures are reused; disposable accounts/customers and clocks are cleaned up. Do not run a production build concurrently with the dev server.

Before enabling the production webhook and offering paid signup:

1. Deploy the code with the long-lived runtime key, Product ID, Portal configuration, and signing secret.
2. Confirm `Account` billing fields and `StripeWebhookEvent` exist in the deployed database. This patch does not introduce a schema migration.
3. Run a full subscription lifecycle in an authorized Stripe sandbox: Checkout, trial, renewal, failure, recovery, cancellation, duplicate delivery, and delayed delivery.
4. Confirm the owner page and public storefront agree on entitlement.
5. Enable the registered production webhook and verify its delivery logs.

Unit tests exercise catalog changes, stale-price rejection, subscription identity checks, trial/grace boundaries, signature verification, retry behavior, and billing denial before revision generation. They do not substitute for a sandbox payment lifecycle or deployed Postgres transaction checks.

References: [manage Products and Prices](https://docs.stripe.com/products-prices/manage-prices), [subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks), [Customer Portal](https://docs.stripe.com/customer-management).
