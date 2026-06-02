# Documentation Map

Use this page as the entry point for project documentation.

## Current Operational Docs

These documents should match the running application:

- [`../README.md`](../README.md): local setup, environment variables, routes, scripts, and deployment summary.
- [`data-model.md`](data-model.md): current Prisma model and the remaining SaaS data-model work.
- [`supabase-r2-setup.md`](supabase-r2-setup.md): Supabase runtime, archived SQLite migration tooling, and R2 transition steps.
- [`production-roadmap.md`](production-roadmap.md): checkpoint status and the remaining path to a paid deployment.
- [`vercel-deployment.md`](vercel-deployment.md): Vercel environment variables, R2 CORS, auth URLs, preview QA, and remaining serverless hardening.
- [`auth-and-system-handoff.md`](auth-and-system-handoff.md): detailed implementation handoff for Supabase Auth, development owner provisioning, current application flows, OAuth planning, and known gaps.
- [`store-owner-profile.md`](store-owner-profile.md): public storefront, onboarding, profile editor, collections, and reviews.

## Architecture Notes

- [`../CLAUDE.md`](../CLAUDE.md): implementation conventions and prompt-generation architecture.
- [`../styles.md`](../styles.md): pendant style registry, prompt templates, and generation details.
- [`../SAAS_PRODUCT_MAP.md`](../SAAS_PRODUCT_MAP.md): SaaS roadmap. Treat this as planning material; confirm implementation status against the Prisma schema and operational docs.

## Historical Reference Files

These files preserve design context but are not setup instructions:

- [`../design.md`](../design.md)
- [`../VVS-Studio implementation.md`](../VVS-Studio%20implementation.md)
- [`../owner-frontend-for-stitch.md`](../owner-frontend-for-stitch.md)
- [`../agent-context/owner-frontend-for-stitch.md`](../agent-context/owner-frontend-for-stitch.md)

## Documentation Rules

When behavior changes:

1. Update `README.md` when setup, scripts, routes, or deployment behavior changes.
2. Update `data-model.md` when Prisma models or production schema plans change.
3. Update `supabase-r2-setup.md` when database or object-storage operations change.
4. Keep historical design files intact unless their purpose changes. Add a note instead of rewriting old implementation history.
