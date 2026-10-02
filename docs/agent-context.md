# Agent Context

This file is a handoff for future coding agents. It captures operational project knowledge, user preferences, MVP visibility decisions, and known traps. Verify implementation details in code before making risky changes.

## Repo And Workflow

- Primary working checkout: `/home/rox/Documents/Coding projects/mvp-jewelry-app2`.
- Older notes may mention `/home/rox/Documents/mvp-jewelry-app2`; treat that as a historical path alias unless verified.
- The worktree is often dirty. Never revert unrelated changes unless the user explicitly asks.
- Keep changes scoped. Read current files and a scoped diff before patching.
- Default checks for narrow changes:
  - `npx tsc --noEmit`
  - `git diff --check`
  - targeted curl/browser smoke check when useful
- Do not run broad test suites for every small UI change. Use them when shared behavior, data models, providers, or route contracts change.
- Use `rg` for search and `apply_patch` for manual edits.

## MVP Scope

The MVP is intentionally streamlined.

Visible owner navigation:

- `Quotes` -> `/owner`
- `Design` -> `/owner/design`
- `Studio` -> `/owner/vvs-studio`
- `Settings` -> `/owner/settings`

Hidden from normal navigation but kept alive by direct URL:

- `/owner/reviews`
- `/owner/collections`
- `/owner/profile`

Customer routing:

- `/s/:slug` validates the active/published store and redirects to `/s/:slug/design`.
- `/s/:slug/design` is the public QR design entrypoint with tenant attribution.
- `/s/:slug/review` remains accessible by direct URL.
- `/s/:slug/quote` remains accessible by direct URL.

Data collection stays on:

- onboarding still collects profile information and optional products
- backend routes and Prisma models for profile, products, collections, and reviews remain intact
- do not delete future-roadmap data because the frontend currently hides it

## Architecture Overview

- Runtime database: Supabase Postgres through Prisma.
- Auth: Supabase Auth, linked to application `User` and `AccountMembership` rows.
- Durable media target: Cloudflare R2. Local generated paths are development or temporary processing only.
- Owner dashboard:
  - `/owner` is request-centric quote review. An eligible request has one `Prepare Quote` action; standalone 3D and quick-video actions must route into quote preparation.
  - `/owner/design` embeds the main customer pendant wizard inside owner context.
  - The `3D Models` view filters shared quote preview cards that contain 3D media. It is not a separate model-job experience.
  - Legacy `/owner/models/:modelJobId` and video-job pages redirect into the related quote flow when the job is bound to a quote.
  - `/owner/vvs-studio` is the owner Studio home for social/product content generation.
- Customer design flow:
  - every `Request`-backed generation family becomes quote-eligible once it has a successful image and captured customer contact.
  - necklace requests are special: no pendant upload means no provider generation, just a static style/color reference `Result`; pendant upload triggers one Gemini request with the selected necklace reference plus the uploaded pendant.
  - eligibility automatically creates exactly one private draft `QuoteRequest`; customer interaction with a request-quote control is not required.
  - VVS Studio remains owner-only and separate from this automatic rule unless a VVS output is deliberately associated with customer contact.
  - generated/request media should be durable in R2 for production.
- Internal tools:
  - `/internal/generations` is for prompt/output review and style/font tooling.
  - Use `/internal/generations` first when asked how long a past generation took. It displays each persisted `Result.durationMs` beside the request text, style, variant, status, and model; do not start with an ad-hoc database query when this review tool is available.
  - internal generation review must show data actually stored/sent for that generation, not reconstructed current state.

## Prompting And Generation Rules

- Do not edit prompt templates unless the user explicitly asks.
- The user often supplies exact prompt wording. Preserve it.
- Name pendant styles live under `src/lib/styles/<style-id>/`.
- Style attachments can include pendant references, color-aware emblem references, and optional font-rendered text references.
- `Result.attachmentPathsJson` is the source of truth for what was actually attached to historical generation requests.
- Historical rows may not have attachment snapshots. Do not synthesize a font/emblem attachment in review UI unless the row recorded it.
- Some styles intentionally disable font rendering, for example `pooh`.
- Color-aware emblem selection applies only to iced-out pendants and follows the selected primary metal.
- See `docs/prompting-architecture.md` and `styles.md` before changing style, attachment, model, or review-tool behavior.

## VVS Studio

- `/owner/vvs-studio` is the Studio home.
- Product Video opens `/owner/vvs-studio/video`.
- Showcase Post opens `/owner/vvs-studio/image`.
- AI UGC Video opens `/owner/vvs-studio/ugc` and is currently coming soon.
- The Studio calendar is a cadence reminder, not a full scheduling calendar.
- Generated Posts should show only real VVS Studio generated media. Do not show placeholders when empty.
- Do not reintroduce manual post scheduling unless the user asks.
- The image flow should visually mirror the video flow, but generates still product photography with 4:3 or 9:16 output.

## Quote Preparation And Preview Media

- `QuoteRequest.requestId` is nullable for general/manual quotes and unique when present, enforcing one automatic draft per generated request.
- The owner selects the exact `Result` or `ResultRevision` used in the quote. Never infer the selection from the newest or highest-numbered image.
- `Image only` is the default preview mode. `Image + 3D` and `Image + Video` are optional and must be offered only when the generation family supports them.
- Creating a quote link does not publish it. The quote remains private until preparation is finalized and its selected paid-media job, if any, succeeds.
- Automatic private quote drafts do not consume a usage credit; the billable quote milestone remains the owner sending/publishing the quote.
- `previewMediaType`, `resultId`/`resultRevisionId`, `model3dId`, and `videoId` are explicit quote associations. Public preview code must not discover the latest media job implicitly.
- Owner and customer surfaces render the same quote preview card. The card owns the image/3D or image/video selector and all completed 3D/video presentation.
- 3D generation creates `Model3dGeneration`, submits Wavespeed Rodin, polls in request-scoped background work, downloads the GLB to generated-media storage, and attaches the succeeded job to its quote.
- Real provider generation requires a public source image URL. Localhost source images are rejected by `assertPublicImageUrl`; use a deployed/preview URL or a tunnel for end-to-end provider testing.
- GLB files served from R2 need browser `GET` CORS because `<model-viewer>` fetches them client-side.
- Historical quote, video, and model rows are backfilled only when account/request/source ownership can be matched safely; ambiguous records remain unbound for manual review.
- See `docs/necklace-generation.md` before changing necklace prompt generation, color reference mapping, upload handling, or quote snapshot behavior.

## Deployment Notes

- Vercel is the current production direction.
- Supabase Postgres stores relational data.
- Cloudflare R2 stores generated images, videos, uploads, logos, and durable media.
- Do not rely on Vercel function filesystem persistence.
- Keep secrets in `.env.local` or platform env vars. Do not commit `.env`, `.env.local`, API keys, database passwords, Supabase secret keys, R2 keys, or Twilio credentials.
- Cloudflare Workers deployment was considered more complex because of Prisma/runtime compatibility, native image processing, local filesystem assumptions, and worker runtime constraints.

## Roadmap And Deferred Features

Deferred from visible MVP but intentionally preserved:

- public profile storefront
- collections/product browsing
- reviews dashboard and public review links in navigation
- Twilio quote delivery
- Stripe subscriptions/trials
- VVS Studio UGC video
- VVS Studio durable queue/model A-B testing hardening
- richer prompt/model/style editing tools

## Known Pitfalls

- Repo path confusion can waste time. Start from the Coding projects checkout.
- Protected owner routes require an authenticated session for browser QA.
- Older docs may describe Reviews, Collections, and Profile as visible; for MVP they are hidden from navigation.
- `StorefrontCollections` can still exist as an unused component while `/s/:slug` redirects.
- Font rendering can clip decorative glyphs if using SVG/sharp paths. Browser/opentype canvas rendering is more faithful.
- Internal generation review must not lie by showing current attachments for old requests.
- Some Supabase/Prisma commands need `DIRECT_URL`; local env may be missing it.
