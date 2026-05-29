# SaaS Product Map

This app is moving from a single-store MVP into a multi-tenant SaaS for jewelry stores.

## Roles And Ownership

Use these terms consistently:

- `SaaS Admin`: you, the platform owner. Can monitor and manage every account, store owner, customer, quote, generation, video, billing record, and usage record.
- `Account`: the tenant. One jewelry store business/customer of the SaaS.
- `Store Owner`: your client. Has one login for v1 and can only see/manage their own account.
- `Customer`: the store owner's customer. Anonymous while browsing/generating; becomes a CRM contact only after submitting a form or quote request.

Generated images, videos, prompts, and system behavior are owned/controlled by the SaaS platform. Store owners get account-level access and usage rights through their subscription.

## Product Decisions Locked For Beta

- Tenant object name: `Account`.
- Billing model: subscription only.
- Beta staff model: one store owner per account. No staff invites yet.
- Customer auth: none for v1. Customers stay anonymous until form/quote submission.
- Tenant routing: path-based for beta, such as `/a/:accountSlug` or `/s/:accountSlug`.
- Prompt/model control: SaaS admin only. Store owners do not edit prompts.
- Messaging: real email and/or SMS quote follow-up is in scope.
- Plan details are intentionally deferred. Build billing hooks without hardcoding tiers/prices yet.

## Target Product Surface

Customer-facing account storefront:

- Public store owner profile page for Instagram/TikTok bio links.
- Branded name pendant builder.
- Store logo at the top.
- Account-specific color theme.
- Anonymous generation flow.
- Quote intake for customer-uploaded inspiration/product photos.
- Product collections and product grid.
- Quote/contact form creates a customer record for that account.
- Optional future payment/deposit flow after a quote.

Store owner dashboard:

- Quotes.
- Customers CRM.
- Generate Video.
- Videos.
- Account settings.
- Branding.
- Billing and usage.

SaaS admin dashboard:

- All accounts.
- All customers and quote requests across accounts.
- All image/video generations across accounts.
- Usage and cost monitoring.
- Billing status.
- Subscription and usage controls.
- Account disable/enable.
- Support/debug views with audit logging.

## Data Model Direction

Core models to add or reshape:

- `Account`
  - `id`
  - `name`
  - `phone number`
  - `email`
  - `slug`
  - `logoUrl`
  - `themeKey`
  - `status`
  - `stripeCustomerId`
  - `stripeSubscriptionId`
  - `subscriptionStatus`
  - timestamps

- `User`
  - real authenticated user record, replacing the current demo/access-code assumptions.

- `AccountMembership`
  - links a store owner user to one account.
  - v1 can enforce one owner per account.

- `Customer`
  - belongs to one account.
  - stores customer name, phone, email, consent flags, notes, tags, and status.

- `UsageEvent`
  - append-only usage events for SaaS admin cost visibility.
  - examples: image generation, video generation started, video generation succeeded, video generation failed, outbound SMS sent.

- `Message`
  - outbound email/SMS records tied to account/customer/quote.

Existing models that need `accountId`:

- `Request`
- `Result`
- `VideoGeneration`
- `QuoteRequest`
- `Lead` or its replacement `Customer`
- `AppSetting`

Important rule: all store-owner queries must be scoped by `accountId`. SaaS admin views may cross account boundaries, but should be auditable.

## Billing And Usage Scaffold

The first billing implementation should support subscriptions without forcing final plan/pricing decisions.

Billing behavior to implement before launch:

- Store owner access is gated by active subscription status.
- Stripe webhooks are the source of truth for subscription status.
- Store owners can open Stripe checkout or billing portal from their account page.
- SaaS admin can see each account's subscription status.
- Exact plans and prices are TBD and should not be hardcoded yet.

Usage behavior to implement before launch:

- Track image generations, video generations, failed jobs, and outbound messages per account.
- Show SaaS admin provider-cost exposure across all accounts.
- Keep the current video confirmation warning because video jobs cost provider money.
- Do not present usage as a billing plan or credit package unless plan policy changes later.

Pricing can wait. Account/subscription/usage hooks cannot.

## Two-Tier To-Do List

### Tier 1: SaaS Beta Spine

These items should happen before putting real stores through Stripe.

1. Add the `Account` tenant model.
2. Add `accountId` to every customer/generation/quote/video/settings model.
3. Migrate current demo data into a seed `Account`.
4. Replace `OWNER_ACCESS_CODE` with real auth.
5. Add `User` and `AccountMembership`.
6. Enforce one store owner per account for v1.
7. Add SaaS admin role and a separate SaaS admin dashboard route.
8. Move from SQLite to Postgres.
9. Add path-based account routing for customer storefronts.
10. Resolve account by slug before creating any customer request.
11. Add account-branded customer storefront URLs.
12. Add owner Customers CRM page.
13. Convert form/quote submissions into account-scoped `Customer` records.
14. Add customer profile pages with timeline of quotes, generations, videos, notes, and messages.
15. Add account branding settings: store name, logo upload, and theme selection.
16. Create at least 5 predefined themes.
17. Apply account theme/logo to customer-facing pages.
18. Add public store owner profile page at `/s/:accountSlug`.
19. Add onboarding fields for profile photo, cover photo, display name, Instagram handle, phone number, services, collections, and products.
20. Add admin profile/catalog forms for profile basics, service buttons, collections, and products.
21. Add subscription fields to `Account`.
22. Add usage ledger tables for cost monitoring.
23. Gate owner access and generation actions by active subscription status.
24. Add Stripe customer/subscription fields to `Account`.
25. Add Stripe checkout or billing portal scaffold.
26. Add Stripe webhook route and persist subscription status from webhooks.
27. Move generated media to Cloudflare R2 through a production-safe storage adapter.
28. Add email/SMS provider abstraction for quote follow-up.
29. Add consent fields for email/SMS contact.
30. Add basic SaaS admin monitoring for accounts, usage, costs, and failed jobs.

## Production Storage Decision

Use Supabase/Postgres for relational application data and Cloudflare R2 for generated media.

Supabase/Postgres should store:

- accounts
- users and memberships
- customers
- requests, results, and video metadata
- quote requests
- subscription state
- messages, usage events, and audit logs

Cloudflare R2 should store:

- generated pendant images
- generated videos
- store logos
- customer-uploaded picture pendant images
- future exports or downloadable assets

The database should store media metadata and references only:

- `accountId`
- public or signed URL
- storage key
- content type
- byte size
- owner type/id

Do not store generated videos in Supabase Storage for the SaaS version. Supabase Storage can work for small tests, but videos will hit storage and bandwidth limits quickly. R2 is the preferred long-term object storage path.

### Tier 2: Real SaaS Hardening

These items make the product durable after beta.

1. Staff accounts and invites.
2. Per-role permissions.
3. Audit logs for SaaS admin and store owner actions.
4. Custom domains.
5. Usage limits or cost guardrails, if needed.
6. Store-owner analytics: visits, generations, quote requests, quote sent, quote closed.
7. SaaS admin analytics: revenue, usage, margins, provider spend.
8. Background job queue for image/video generation.
9. Retry policy for failed provider jobs.
10. Rate limiting per account and IP.
11. Account suspension and kill switches.
12. Customer CSV export.
13. Customer deletion and data retention tools.
14. Message templates for email/SMS.
15. Quote deposit or checkout flow.
16. Custom domain SSL automation.
17. Backup and restore testing.
18. Prompt/model versioning.
19. Support impersonation with audit logs.

## Open Questions To Decide Before Launch

These are not philosophical. They change code and cost behavior.

1. Which exact Stripe subscription states block account access: unpaid, past_due, canceled, incomplete, paused?
2. Should generation/video actions be blocked immediately when subscription is inactive, or should there be a grace period?
3. Do you want internal usage limits later, or only monitoring/alerts?
4. If usage limits are added later, do they block generation or just alert SaaS admin?
5. Which SMS/email providers are acceptable: Twilio, SendGrid, Resend, Postmark, or something else?
6. What consent language must appear on quote forms before sending SMS/email?
7. Do customers need to opt into SMS separately from email?
8. Does every account get one public slug forever, or can store owners change it?
9. What happens to public links if an account slug changes?
10. Will SaaS admin support be allowed to view customer PII by default, or only through an audited support mode?
11. What data should be exportable by store owners?
12. What data should be deleteable by store owners versus only by SaaS admin?
13. Are stores allowed to use generated images/videos outside the app in marketing?
14. Do subscription cancellations keep the storefront visible, freeze admin access, or archive the account?
15. What is the refund policy for subscription fees?

## Recommended Build Order

Do this in sequence:

1. Data model and Postgres.
2. Auth and account scoping.
3. Path-based storefront routing.
4. Owner Customers CRM.
5. Branding and themes.
6. Usage ledger.
7. Stripe subscription scaffold.
8. SaaS admin dashboard.
9. Email/SMS quote messaging.
10. Production media storage and background jobs.

The trap is building Stripe first. Billing should attach to a correct account/usage model, not the other way around.
