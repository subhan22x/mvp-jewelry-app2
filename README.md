# Pendant MVP

A custom jewelry pendant ideation web app. A store employee or customer enters a name, picks a style, emblem, and gold finish; the app calls Gemini to generate two AI image previews so the customer can pick a favorite before ordering.

The app is **not** a CAD tool, checkout system, or manufacturing pipeline. It is a fast visualizer. Success = "yes, that's close to what I want."

## Status

- **Working visible MVP flows:** custom name pendants, picture pendants, owner quote review, owner Design, and VVS Studio.
- **Hidden but preserved:** public storefront profile, collections, and reviews remain implemented and data-backed, but are hidden from normal MVP navigation.
- **Current tenant mode:** owner dashboard routes resolve the signed-in owner's active account membership. Customer pendant requests still default to the seeded `demo` storefront until storefront-aware design links are completed.
- **SaaS direction:** see `SAAS_PRODUCT_MAP.md` for the planned multi-account SaaS architecture, subscription billing, CRM, and onboarding roadmap.
- **Data model review:** see `docs/data-model.md` for current and target ER diagrams.
- **Production storage direction:** Supabase/Postgres for relational data; Cloudflare R2 for generated images, videos, logos, and uploads.
- **Supabase/R2 setup notes:** see `docs/supabase-r2-setup.md`.
- **Vercel deployment:** see `docs/vercel-deployment.md`.
- **Prompting architecture:** see `docs/prompting-architecture.md`.
- **Agent handoff and MVP scope:** see `docs/agent-context.md`.
- **Documentation map:** see `docs/README.md`.

## Prerequisites

- Node 20 LTS or newer for the application
- Node 22 or newer when running `npm run r2:migrate-generated`
- A Gemini API key (`GEMINI_API_KEY`)

## Setup

All commands run from the repository root:

```bash
npm install
```

Create `.env.local`:

```bash
GEMINI_API_KEY=your_key_here
# optional overrides
# GEMINI_MODEL_ID=gemini-3.1-flash-image-preview
# GENERATED_IMAGE_DIR=public/generated
# WAVESPEED_API_KEY=your_wavespeed_key_here
# FAL_KEY=your_fal_key_here
# VIDEO_ACCESS_CODE=ID8
# VVS_WORKER_SECRET=long_random_secret
# CRON_SECRET=long_random_secret
# VVS_INTERNAL_ADMIN_EMAILS=you@example.com
# NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# SUPABASE_SECRET_KEY=sb_secret_...
# VIDEO_DURATION_SECONDS=7
# APP_BASE_URL=https://your-public-app-url.example
# NEXT_PUBLIC_APP_URL=https://your-public-app-url.example
# DEFAULT_ACCOUNT_ID=your-public-wizard-account-id
# Required in production: Cloudflare R2 durable media storage.
# R2_ACCOUNT_ID=...
# R2_ACCESS_KEY_ID=...
# R2_SECRET_ACCESS_KEY=...
# R2_BUCKET_NAME=mvp-jewelry-media
# R2_PUBLIC_BASE_URL=https://media.example.com
```

Configure Supabase Postgres in `.env.local`, then initialize the development database:

```bash
npm run prisma:generate
npm run supabase:push
npm run db:seed   # creates the demo user
```

In the Supabase Auth dashboard, add the deployed and local auth callbacks to **Redirect URLs** before testing email signup:

```text
https://your-public-app-url.example/auth/confirm
https://your-public-app-url.example/auth/callback
http://localhost:3000/auth/confirm
http://localhost:3000/auth/callback
```

Add both `/auth/confirm` and `/auth/callback` for any alternate local dev port you use, such as `http://localhost:3001`. If these URLs are missing, Supabase can fall back to the bare Site URL after email verification, leaving the user with a confirmed login but no linked owner profile yet. The app also defensively handles bare-root `?code=...` callbacks, but the explicit Redirect URLs are still the clean path.

For an existing Postgres database created before the consolidated quote flow, run `npm run supabase:migrate-quote-flow` before `npm run supabase:push`. The migration is idempotent and performs the historical quote/media backfill without deleting duplicate quote rows.

Create a real development owner login when needed:

```bash
DEV_OWNER_EMAIL="you@example.com" \
DEV_OWNER_PASSWORD="choose-a-local-password" \
DEV_OWNER_ACCOUNT_SLUG="dev" \
npm run auth:provision-dev-owner
```

This provisions a real Supabase Auth identity and links it to an active Prisma owner membership. It is separate from the public-only seeded demo storefront. Keep the password in `.env.local` or pass it inline; do not commit it.

Run the dev server. `run.sh` performs the Prisma generation and demo seed steps and reports a port conflict before startup:

```bash
./run.sh
```

Open [http://localhost:3000](http://localhost:3000).

## Owner dashboard

The polished store-owner dashboard lives at `/owner`. It is request- and quote-centric, separate from the customer pendant builder and the raw internal generation review page.

- Configure Supabase Auth variables in `.env.local` or Render.
- Visit `/login` and sign in with the email and password created during onboarding.
- Every account-scoped `Request` with at least one successful image and captured customer contact automatically receives one draft `QuoteRequest`. The customer does not need to press a separate request-quote button.
- This applies to every generation family backed by `Request`; all successful original results and revisions remain available for owner selection. Owner-only VVS Studio output is not automatically quote-eligible until it is associated with customer contact.
- The dashboard exposes one action for an eligible request: `Prepare Quote`.
- Quote preparation lets the owner select the exact original `Result` or `ResultRevision`, enter the price and quote details, and create the private quote link.
- After creating the link, the owner chooses preview media. `Image only` is the default; supported products may use `Image + 3D` or `Image + Video`.
- The public quote stays unavailable until quote preparation is finalized and any selected 3D or video generation succeeds. A failed or pending paid-media job must not expose a partial public quote.
- Owner and customer views use the same quote preview card. Its selector shows the quoted image plus the explicitly attached 3D model or video.
- The `3D Models` dashboard view filters quote preview cards that contain 3D media; it is not a separate model-job UI.
- Legacy standalone video and 3D job pages redirect into the related quote preparation or preview flow when the job can be bound to a quote.
- Completed Wavespeed media is stored on `VideoGeneration` or `Model3dGeneration` and associated explicitly with the quote. The original provider URL is retained alongside the durable media URL.
- Visible owner navigation is intentionally limited to Quotes (`/owner`), Design (`/owner/design`), Studio (`/owner/vvs-studio`), and Settings (`/owner/settings`) for the MVP.
- `/owner/profile`, `/owner/collections`, and `/owner/reviews` remain available by direct URL for internal/admin use, but are hidden from normal owner navigation.
- `/owner/profile` edits the stored storefront profile, profile image, phone, Instagram handle, website, city/country location, and two extra public links. It also exposes copy/share controls for `/s/:slug` and the QR design URL `/s/:slug/design`.
- The profile editor uses a country-aware phone input and best-effort verifier icons for Instagram, Website, and extra links.
- `/owner/collections` manages product pieces by fixed categories. Draft pieces use `Product.isActive = false`; published pieces remain stored for the future storefront.
- `/owner/reviews` shows persisted `StoreReview` rows, filters/searches reviews, and includes a request-review pane for sharing `/s/:slug/review`.
- During the MVP, `/s/:slug` redirects customers into `/s/:slug/design`. `/s/:slug/design` is the public QR entrypoint and keeps generated requests, leads, quotes, and usage tied to the store account. `/s/:slug/review` and `/s/:slug/quote` remain directly accessible.
- The Prompt System control now lives on `/owner/account` and switches new name generations between `json` and `natural_language` prompt modes.
- `Send Quote` currently opens manual delivery options. The owner can copy the prepared message or open the device share sheet. Twilio and email delivery are intentionally not wired yet.

## Vercel deployment

The app is prepared for Vercel with Supabase Postgres and Cloudflare R2. Production durable writes fail closed when R2 is missing, large browser uploads use signed direct-to-R2 `PUT` URLs, and async generation routes use Vercel `waitUntil()` with a five-minute function duration.

Use [`docs/vercel-deployment.md`](docs/vercel-deployment.md) for the environment checklist, required R2 CORS policy, Supabase Auth callback URLs, preview QA steps, and the remaining durable-queue work.

## Render deployment

The repo still includes `render.yaml` as an alternative Node deployment. Configure R2 for production even when Render has a disk fallback.

Render settings:

```bash
Build command: npm ci && npm run prisma:generate && npm run build
Start command: npm run start
Persistent disk mount: /var/data
```

Required Render environment variables:

```bash
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
GENERATED_IMAGE_DIR=/var/data/generated
GOOGLE_API_KEY=...
WAVESPEED_API_KEY=...
FAL_KEY=...
VIDEO_ACCESS_CODE=ID8
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
NAME_PROMPT_MODE=json
VIDEO_DURATION_SECONDS=7
APP_BASE_URL=https://your-render-service.onrender.com
```

Generated files are served through `/generated/:file` during local development. Production media belongs in R2.

## Environment variables

| Variable               | Default                              | Purpose                                       |
| ---------------------- | ------------------------------------ | --------------------------------------------- |
| `GEMINI_API_KEY`       | (required)                           | Gemini auth. `GOOGLE_API_KEY` and `IMAGE_API_KEY` are accepted aliases. |
| `GEMINI_MODEL_ID`      | `gemini-3.1-flash-image-preview`     | Model used by the connector.                  |
| `GENERATED_IMAGE_DIR`  | `public/generated`                   | Where generated images, downloaded videos, and GLB models are written when R2 is not configured. |
| `WAVESPEED_API_KEY`    | (required for videos and 3D models)  | Wavespeed auth for VVS Studio image/video, Seedance video generation, and Rodin image-to-3D generation. The key must be active; Wavespeed returns `401 Unauthorized` for invalid or non-topped-up keys. |
| `FAL_KEY`              | (required for VVS image posts)       | fal auth for the first VVS Studio publishable image shot through `openai/gpt-image-2/edit`. `FAL_API_KEY` is also accepted. |
| `VIDEO_ACCESS_CODE`    | (required for customer video flow)   | Internal code required before customer-facing video generation. Owner dashboard video jobs use owner access instead. |
| `VVS_WORKER_SECRET`    | (required in production)             | Secret accepted by the VVS Studio durable job worker. |
| `CRON_SECRET`          | (recommended on Vercel)              | Vercel cron secret. Also accepted by the VVS Studio worker. |
| `VVS_INTERNAL_ADMIN_EMAILS` | empty                            | Comma-separated owner emails allowed to edit VVS Studio model, prompt, and style settings. |
| `NEXT_PUBLIC_SUPABASE_URL` | (required for owner auth)        | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | (required for owner auth) | Browser-safe Supabase publishable key. |
| `SUPABASE_SECRET_KEY`  | (required for onboarding cleanup)     | Server-only Supabase secret key. Never expose it to the browser. |
| `NAME_PROMPT_MODE`     | `json`                               | Fallback prompt mode for name generations: `json` or `natural_language`. `/owner` can override it in Prisma. |
| `VIDEO_DURATION_SECONDS` | `7`                                | Seedance video duration, clamped from 4-15 seconds. |
| `VIDEO_RESOLUTION`     | `720p`                               | Seedance output resolution: `480p`, `720p`, or `1080p`. |
| `VIDEO_PROMPT`         | built-in fallback                    | Optional exact prompt sent to Seedance.       |
| `APP_BASE_URL`         | (required for videos and 3D models)  | Public base URL used so Wavespeed can fetch generated images. |
| `NEXT_PUBLIC_APP_URL`  | (recommended in production)         | Browser-visible deployed application URL. |
| `MODEL3D_PROMPT`       | built-in jewelry prompt              | Optional Rodin prompt override for quote-bound 3D preview jobs. |
| `MODEL3D_TIER`         | `Gen-2.5-High`                       | Rodin generation tier. |
| `MODEL3D_POLL_TIMEOUT_MS` | `180000`                          | Maximum wait for Rodin image-to-3D polling. |
| `DEFAULT_ACCOUNT_ID`   | (required in production)            | Account receiving root design-wizard requests until storefront-aware links replace this fallback. |
| `R2_ACCOUNT_ID`        | (required in production)            | Cloudflare account ID for R2 media storage. |
| `R2_ACCESS_KEY_ID`     | (required in production)            | R2 access key ID. |
| `R2_SECRET_ACCESS_KEY` | (required in production)            | R2 secret access key. |
| `R2_BUCKET_NAME`       | (required in production)            | R2 bucket for generated media. |
| `R2_ENDPOINT`          | derived from `R2_ACCOUNT_ID`         | Optional explicit R2 S3 endpoint. |
| `R2_PUBLIC_BASE_URL`   | (required for R2)                    | Public base URL or custom domain for R2 objects. |

## npm scripts

| Script                    | What it does                                          |
| ------------------------- | ----------------------------------------------------- |
| `npm run dev`             | Next.js dev server                                    |
| `npm run build`           | Next.js production build                              |
| `./run.sh`                | Generate Prisma client, seed demo data, and start local development with a port preflight |
| `KILL_PORT=1 ./run.sh`    | Stop an existing local listener on the selected port before development startup |
| `PORT=3001 ./run.sh`      | Start local development on another port |
| `npm run start`           | Start the production server without mutating database state |
| `npm run start:next`      | Run Next.js production server without seed            |
| `npm run start:render`    | Start the Render production server                    |
| `npm test`                | Vitest unit tests                                     |
| `npm run test:e2e`        | Playwright end-to-end tests (requires dev server)     |
| `npm run prisma:generate` | Generate Prisma client                                |
| `npm run prisma:migrate`  | Push the current Postgres schema to Supabase           |
| `npm run db:seed`         | Seed the `demo` user                                  |
| `npm run supabase:push`   | Push the Postgres schema to Supabase using `.env.local` |
| `npm run supabase:migrate-quote-flow` | Apply the idempotent consolidated-quote schema migration and historical backfill |
| `npm run supabase:migrate-metadata` | Copy archived SQLite rows to Supabase/Postgres; the historical script name is retained |
| `npm run supabase:audit`  | Compare canonical SQLite and Supabase/Postgres table counts |
| `npm run supabase:audit-rls` | Confirm public Prisma tables remain protected by RLS with no direct browser policies |
| `npm run auth:provision-dev-owner` | Create or repair a real development owner login using local-only environment values |
| `npm run r2:migrate-generated` | Upload local generated media to R2 and rewrite matching SQLite/Supabase URLs |
| `npm run styles`          | Manage `data/pendant-styles.json` via script          |

## Generation and quote flow

```
Home or /s/:slug/design
 └─ Customer completes a supported design flow and supplies contact information
     └─ Generated images appear progressively
         └─ First successful image + contact creates one private draft QuoteRequest
             └─ Owner selects Prepare Quote
                 ├─ Select exact original result or revision
                 ├─ Enter price, delivery, material, stone, and notes
                 ├─ Create private quote link
                 └─ Choose preview media
                     ├─ Image only (default)
                     ├─ Image + 3D (supported products only)
                     └─ Image + Video (supported products only)
                         └─ Finalize and make the completed quote public
```

Generation is **asynchronous** — the results screen appears immediately after submitting and tiles fill in one by one as Gemini completes each variant (~10–50 s total). The first image typically appears within 15–20 s.

Automatic draft creation is idempotent: a request owns at most one `QuoteRequest`, even when multiple images or revisions finish. Historical request-backed quotes and media jobs are backfilled into this relationship where their account, request, and selected source can be identified safely.

## Testing

Unit tests use Vitest + Testing Library and run without a server:

```bash
npm test
```

End-to-end tests use Playwright and require `npm run dev` to be running on port 3001:

```bash
npm run test:e2e
```

Playwright browsers must be installed once: `npx playwright install chromium`.

## Where things live

```
app/
  page.tsx                   # responsive marketing landing page
  design/page.tsx            # home screen with style entry cards
  design/DesignEntry.tsx     # reusable design entry UI for /design and /s/:slug/design
  name/page.tsx              # the 4-step name pendant flow (steps 0–2 + results)
  name/__tests__/            # Vitest unit tests for the name builder
  owner/page.tsx             # request-centric quote dashboard; Prepare Quote is the primary action
  owner/account/page.tsx     # owner account settings, including Prompt System
  owner/profile/page.tsx     # hidden-MVP profile editor, direct URL still works
  owner/collections/page.tsx # hidden-MVP collection/piece manager, direct URL still works
  owner/reviews/page.tsx     # hidden-MVP review dashboard, direct URL still works
  owner/videos/page.tsx      # legacy video-job list retained for unbound historical jobs
  owner/videos/[videoJobId]/page.tsx # legacy bound-job redirect into quote flow
  owner/models/[modelJobId]/page.tsx # legacy bound-job redirect into quote preview
  profile/page.tsx           # authenticated shortcut to /owner/profile
  profile/[accountSlug]/page.tsx # compatibility redirect to /s/:slug
  s/[accountSlug]/page.tsx   # validates store, then redirects public traffic to /s/:slug/design
  s/[accountSlug]/design/    # public QR design flow with tenant attribution
  s/[accountSlug]/review/    # public customer review form
  api/requests/route.ts      # POST /api/requests — creates a Request and starts async generation tasks
  api/necklace-requests/route.ts # POST — creates necklace Requests; generates only when a pendant is uploaded
  api/requests/[id]/route.ts # GET — poll for results; returns {results, done}
  api/quote-requests/route.ts # creates/updates the request's single private quote draft
  api/owner/video-jobs/route.ts # starts quote-bound video generation from the selected image
  api/owner/video-jobs/[id]/route.ts # GET — owner polls video job status
  api/owner/model-jobs/route.ts # starts quote-bound Wavespeed Rodin 3D generation
  api/owner/model-jobs/[id]/route.ts # GET — owner polls 3D model job status

data/
  pendant-styles.json        # style list shown in the UI

e2e/
  smoke.spec.ts              # Playwright end-to-end tests

src/lib/styles/              # canonical generation system
  _types.ts
  builder.ts                 # CustomerInput -> 4 BuiltVariants
  connector.ts               # calls Gemini (image-only), writes image, returns public URL
  registry.ts                # loads style.yml + .jsonp templates
  utils.ts                   # renderTemplate (strict placeholder replace)
  <style>/style.yml          # per-style behavior (defaults, variantMatrix, assets)
  <style>/<templateKey>.jsonp # prompt template with {{PLACEHOLDERS}}

src/lib/necklaces/           # necklace style/color reference mapping and pendant-attachment prompt

prisma/
  schema.prisma              # Postgres runtime schema
  schema.postgres.prisma     # Postgres schema used by supabase:push
  schema.sqlite.prisma       # archived SQLite source schema for migration utilities
  postgres-baseline/         # clean Postgres baseline SQL for a new production project
  migrations/                # archived SQLite migration history; do not deploy to Postgres

public/
  pendants/                  # style thumbnails (also used as Gemini reference inputs)
  necklaces/references/      # necklace style/color images used for static previews and Gemini attachments
  emblems/                   # emblem assets
  generated/                 # generated images, downloaded videos, and GLB models output (dev only)
```

The folders `lib/styles/` and `server/db/client.ts` are currently re-export shims pointing at `src/`. See `CLAUDE.md` for why and when they get removed.

## Production notes

**Generated media** — `public/generated/` is local-only. Vercel filesystems are ephemeral. Production deployments require Cloudflare R2 for generated images, videos, logos, and uploads.

**Background tasks on Vercel** — VVS Studio video generation uses a Postgres-backed job table plus the cron worker at `/api/internal/vvs-studio/jobs/process`. The owner route nudges the worker immediately after queueing, while Vercel Cron keeps polling provider jobs. Older pendant video routes still use request-scoped `waitUntil()` and should be migrated before high-volume paid traffic.

## Further reading

- `docs/README.md` — documentation map and source-of-truth guide.
- `docs/agent-context.md` — future-agent handoff, MVP visibility rules, and known pitfalls.
- `docs/production-roadmap.md` — current production checkpoint and remaining blockers.
- `CLAUDE.md` — architecture, style/prompt conventions, prompt-engineering rules, what not to do.
