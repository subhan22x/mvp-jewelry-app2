# Production Roadmap

This is the operational path from the current internal MVP to a paid SaaS deployment.

## Current Checkpoint

Completed:

- Repository flattened so the Git root is the application root.
- Runtime Prisma client switched from SQLite to Supabase Postgres.
- Archived SQLite source isolated for migration and audit tooling.
- Archived SQLite rows copied to Supabase and row counts audited.
- Render deployment configuration updated with Postgres and R2 environment slots.
- Manual quote delivery supports copy and device share actions without claiming delivery.

Still internal-MVP behavior:

- Email/password owner authentication is wired through Supabase Auth with confirmation callbacks.
- Owner dashboard account resolution uses the signed-in owner's active membership.
- Customer pendant-generation routes still default to the seeded demo account until storefront-aware design links are completed.
- Some durable media writes still fall back to the local Render disk.
- Stripe subscriptions and trials are not implemented.

## Phase 1: Media Hardening

1. Require R2 credentials in production.
2. Route durable generated images, revisions, VVS Studio output, videos, profile images, and product images to R2.
3. Keep local files only for temporary `sharp` processing.
4. Add an R2 custom media domain.
5. Define cleanup behavior for replaced or orphaned media.
6. Add a centralized `MediaAsset` model when storage ownership and deletion workflows are implemented.

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

1. Deploy the Node app to Render.
2. Configure Supabase Postgres and Cloudflare R2 secrets.
3. Connect Cloudflare DNS.
4. Add error tracking, uptime checks, and log retention.
5. Exercise signup, onboarding, Stripe test mode, quote sharing, reviews, collections, profile editing, generation, revisions, and VVS Studio.

## Why Render Node First

The current app uses `sharp` and temporary local processing paths. A Render Node service supports that runtime directly. A Cloudflare Workers migration would require a separate compatibility project and is not required for the initial production deployment.
