# Production Roadmap

This is the operational path from the current internal MVP to a paid SaaS deployment.

## Current Checkpoint

Completed:

- Repository flattened so the Git root is the application root.
- Runtime Prisma client switched from SQLite to Supabase Postgres.
- Archived SQLite source isolated for migration and audit tooling.
- Archived SQLite rows copied to Supabase and row counts audited.
- Vercel deployment runbook added with Postgres, R2, CORS, and Auth callback settings.
- Production durable media writes now fail closed when R2 is missing.
- Browser image uploads use short-lived signed direct-to-R2 URLs when R2 is configured.
- Async generation routes register work with Vercel `waitUntil()` and persist polling state in Postgres.
- Manual quote delivery supports copy and device share actions without claiming delivery.

Still internal-MVP behavior:

- Email/password owner authentication is wired through Supabase Auth with confirmation callbacks.
- Owner dashboard account resolution uses the signed-in owner's active membership.
- Customer pendant-generation routes still default to the seeded demo account until storefront-aware design links are completed.
- Production no longer falls back to durable local filesystem writes.
- Stripe subscriptions and trials are not implemented.

## Phase 1: Media Hardening

1. Run `npm run r2:migrate-generated` before production cutover.
2. Configure an R2 custom media domain and browser-upload CORS.
3. Keep local files only for temporary `sharp` processing.
4. Define cleanup behavior for abandoned `incoming/`, replaced, or orphaned media.
5. Add a centralized `MediaAsset` model when storage ownership and deletion workflows are implemented.

## Phase 2: SaaS Safety

1. Configure Supabase Auth keys, confirmation URLs, and email templates for each environment.
2. Add password reset and account recovery.
3. Remove risky demo-account defaults from remaining customer-generation paths.
4. Add signup and onboarding completion rules.
5. Add Stripe customer, Checkout, webhook, trial, and entitlement handling.
6. Add account-level authorization tests.

## Phase 3: Database Operations

1. Keep the current Supabase project as the development environment.
2. Establish a normal Postgres migration workflow before onboarding paid accounts.
3. Use `prisma/postgres-baseline/0001_initial.sql` only for a fresh baseline.
4. Add backup verification and restore testing.
5. Add indexes based on production query patterns.

## Phase 4: Deployment

1. Deploy a Vercel preview using [`vercel-deployment.md`](vercel-deployment.md).
2. Configure Supabase Postgres and Cloudflare R2 secrets.
3. Connect Cloudflare DNS.
4. Add error tracking, uptime checks, and log retention.
5. Exercise signup, onboarding, Stripe test mode, quote sharing, reviews, collections, profile editing, generation, revisions, and VVS Studio.

## Vercel Runtime Note

Vercel Node functions support the current temporary `sharp` processing paths. Durable media belongs in R2. `waitUntil()` extends the current polling architecture for controlled initial traffic, but it is not a durable queue: add a persistent queue worker before higher-volume paid usage.
