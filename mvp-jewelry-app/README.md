# Pendant MVP

A custom jewelry pendant ideation web app. A store employee or customer enters a name, picks a style, emblem, and gold finish; the app calls Gemini to generate two AI image previews so the customer can pick a favorite before ordering.

The app is **not** a CAD tool, checkout system, or manufacturing pipeline. It is a fast visualizer. Success = "yes, that's close to what I want."

## Status

- **Working flow:** Name pendant only.
- **Disabled placeholders on home:** Logo, Picture Pendants, Custom Design, Get Inspired, Draw Your Design.
- **Single-tenant:** all requests are scoped to a hardcoded `demo` user.
- **SaaS direction:** see `SAAS_PRODUCT_MAP.md` for the planned multi-account SaaS architecture, subscription billing, CRM, and onboarding roadmap.
- **Data model review:** see `docs/data-model.md` for current and target ER diagrams.
- **Production storage direction:** Supabase/Postgres for relational data; Cloudflare R2 for generated images, videos, logos, and uploads.
- **Supabase/R2 setup notes:** see `docs/supabase-r2-setup.md`.

## Prerequisites

- Node 20 LTS
- A Gemini API key (`GEMINI_API_KEY`)

## Setup

All commands run from inside this folder:

```bash
cd mvp-jewelry-app
npm install
```

Create `.env.local`:

```bash
GEMINI_API_KEY=your_key_here
# optional overrides
# GEMINI_MODEL_ID=gemini-3.1-flash-image-preview
# GENERATED_IMAGE_DIR=public/generated
# WAVESPEED_API_KEY=your_wavespeed_key_here
# VIDEO_ACCESS_CODE=ID8
# OWNER_ACCESS_CODE=ID8
# VIDEO_DURATION_SECONDS=7
# APP_BASE_URL=https://your-public-app-url.example
# Optional Cloudflare R2 media storage. If fully configured, generated media writes to R2.
# R2_ACCOUNT_ID=...
# R2_ACCESS_KEY_ID=...
# R2_SECRET_ACCESS_KEY=...
# R2_BUCKET_NAME=mvp-jewelry-media
# R2_PUBLIC_BASE_URL=https://media.example.com
```

Initialize the database (SQLite, on disk at `prisma/dev.db`):

```bash
npm run prisma:generate
npm run prisma:migrate
npm run db:seed   # creates the demo user
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Owner dashboard

The polished store-owner dashboard lives at `/owner`. It is separate from the customer pendant builder and the raw internal generation review page.

- Set `OWNER_ACCESS_CODE` in `.env.local` or Render.
- Visit `/owner` and enter the access code.
- Quote requests show first with large design thumbnails and a `Send Quote` action.
- The `Generate Video` section shows name pendant drafts as compact cards.
- Each draft image has its own `Generate Video` button. The admin can generate more than one video from the same pendant/image, and the button shows when it has been pressed before.
- Because Wavespeed video generation uses paid provider processing, the button opens an `Are you sure?` confirmation before starting a job.
- Owner video jobs are created with owner dashboard access; the older customer-facing video flow still uses `VIDEO_ACCESS_CODE`.
- `/owner/videos` lists all pendant video jobs, including pending, completed, and failed attempts.
- `/owner/videos/[videoJobId]` shows the selected source image, loading/progress state, final video player, download action, and share/copy action.
- Completed Wavespeed videos are downloaded into `GENERATED_IMAGE_DIR`, served from `/generated/:file`, and stored in `VideoGeneration.videoUrl`. The original Wavespeed URL is retained in `VideoGeneration.remoteVideoUrl`.
- The Prompt System control now lives on `/owner/account` and switches new name generations between `json` and `natural_language` prompt modes.
- `Send Quote` currently saves price, note, and `status: sent` only; email delivery is intentionally not wired yet.

## Render deployment

The repo includes `render.yaml` for a quick Render deploy using SQLite plus a persistent disk. This is the lowest-friction MVP setup and keeps generated images/videos metadata durable across deploys.

Render settings:

```bash
Root directory: mvp-jewelry-app
Build command: npm ci && npm run prisma:generate && npm run build
Start command: npm run start
Persistent disk mount: /var/data
```

Required Render environment variables:

```bash
DATABASE_URL=file:/var/data/dev.db
GENERATED_IMAGE_DIR=/var/data/generated
GOOGLE_API_KEY=...
WAVESPEED_API_KEY=...
VIDEO_ACCESS_CODE=ID8
OWNER_ACCESS_CODE=ID8
NAME_PROMPT_MODE=json
VIDEO_DURATION_SECONDS=7
APP_BASE_URL=https://your-render-service.onrender.com
```

Generated files are served through `/generated/:file`, so `GENERATED_IMAGE_DIR` can point at Render's persistent disk instead of `public/generated`.

For a larger production setup, migrate from SQLite to Postgres and move generated files to Cloudflare R2. The Render disk setup is intentionally the quick MVP path.

## Environment variables

| Variable               | Default                              | Purpose                                       |
| ---------------------- | ------------------------------------ | --------------------------------------------- |
| `GEMINI_API_KEY`       | (required)                           | Gemini auth. `IMAGE_API_KEY` is a fallback.   |
| `GEMINI_MODEL_ID`      | `gemini-3.1-flash-image-preview`     | Model used by the connector.                  |
| `GENERATED_IMAGE_DIR`  | `public/generated`                   | Where generated images and downloaded videos are written when R2 is not configured. |
| `WAVESPEED_API_KEY`    | (required for videos)                | Wavespeed auth for Seedance video generation. |
| `VIDEO_ACCESS_CODE`    | (required for customer video flow)   | Internal code required before customer-facing video generation. Owner dashboard video jobs use owner access instead. |
| `OWNER_ACCESS_CODE`    | (required for `/owner`)              | Store-owner dashboard access code.             |
| `NAME_PROMPT_MODE`     | `json`                               | Fallback prompt mode for name generations: `json` or `natural_language`. `/owner` can override it in Prisma. |
| `VIDEO_DURATION_SECONDS` | `7`                                | Seedance video duration, clamped from 4-15 seconds. |
| `VIDEO_RESOLUTION`     | `720p`                               | Seedance output resolution: `480p`, `720p`, or `1080p`. |
| `VIDEO_PROMPT`         | built-in fallback                    | Optional exact prompt sent to Seedance.       |
| `APP_BASE_URL`         | (required for videos)                | Public base URL used so Wavespeed can fetch generated images. |
| `R2_ACCOUNT_ID`        | (optional)                           | Cloudflare account ID for R2 media storage. |
| `R2_ACCESS_KEY_ID`     | (optional)                           | R2 access key ID. |
| `R2_SECRET_ACCESS_KEY` | (optional)                           | R2 secret access key. |
| `R2_BUCKET_NAME`       | (optional)                           | R2 bucket for generated media. |
| `R2_ENDPOINT`          | derived from `R2_ACCOUNT_ID`         | Optional explicit R2 S3 endpoint. |
| `R2_PUBLIC_BASE_URL`   | (required for R2)                    | Public base URL or custom domain for R2 objects. |

## npm scripts

| Script                    | What it does                                          |
| ------------------------- | ----------------------------------------------------- |
| `npm run dev`             | Next.js dev server                                    |
| `npm run build`           | Next.js production build                              |
| `npm run start`           | Run migrations, seed demo user, and start production  |
| `npm run start:next`      | Run Next.js production server without migration/seed  |
| `npm run start:render`    | Alias for `npm run start`                             |
| `npm test`                | Vitest unit tests                                     |
| `npm run test:e2e`        | Playwright end-to-end tests (requires dev server)     |
| `npm run prisma:generate` | Generate Prisma client                                |
| `npm run prisma:migrate`  | Run migrations (`prisma migrate dev`)                 |
| `npm run db:seed`         | Seed the `demo` user                                  |
| `npm run supabase:push`   | Push the Postgres schema to Supabase using `.env.local` |
| `npm run supabase:migrate-metadata` | Copy SQLite metadata rows to Supabase/Postgres |
| `npm run r2:migrate-generated` | Upload local generated media to R2 and rewrite matching SQLite/Supabase URLs |
| `npm run styles`          | Manage `data/pendant-styles.json` via script          |

## User flow (Name pendant)

```
Home
 └─ Name / Initials
     ├─ Step 0: enter pendant text + choose style
     ├─ Step 1: choose emblem + gold finish
     ├─ Step 2: confirm design + diamond quality (VS / VVS)
     ├─ Step 3: two draft tiles appear progressively as each image is generated
     │          (select favourite, preview full-size, download)
     ├─ Step 4: generate a Seedance video from the higher-quality draft
     └─ Step 5: customer taps Get a quote, creating a QuoteRequest snapshot
```

Generation is **asynchronous** — the results screen appears immediately after submitting and tiles fill in one by one as Gemini completes each variant (~10–50 s total). The first image typically appears within 15–20 s.

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
  page.tsx                   # home screen with style entry cards
  name/page.tsx              # the 4-step name pendant flow (steps 0–2 + results)
  name/__tests__/            # Vitest unit tests for the name builder
  owner/page.tsx             # owner dashboard: quote requests + Generate Video section
  owner/account/page.tsx     # owner account settings, including Prompt System
  owner/videos/page.tsx      # all pendant video jobs
  owner/videos/[videoJobId]/page.tsx # video job status/player/download/share page
  api/requests/route.ts      # POST /api/requests — creates a Request and fires 2 async generation tasks
  api/requests/[id]/route.ts # GET — poll for results; returns {results, done}
  api/quote-requests/route.ts # POST — persists the customer quote/admin handoff snapshot
  api/owner/video-jobs/route.ts # POST — owner starts a Wavespeed video job for one Result image
  api/owner/video-jobs/[id]/route.ts # GET — owner polls video job status

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

prisma/
  schema.prisma              # User, Request, Result, Lead, VideoGeneration, QuoteRequest
  migrations/

public/
  pendants/                  # style thumbnails (also used as Gemini reference inputs)
  emblems/                   # emblem assets
  generated/                 # generated images and downloaded videos output (dev only)
```

The folders `lib/styles/` and `server/db/client.ts` are currently re-export shims pointing at `src/`. See `CLAUDE.md` for why and when they get removed.

## Production notes

**Generated media** — `public/generated/` is local-only. Vercel/Netlify filesystems are ephemeral; production deployments should use Cloudflare R2 for generated images, videos, logos, and uploads. Render uses `GENERATED_IMAGE_DIR=/var/data/generated` with a persistent disk for the MVP.

**Background tasks on Vercel** — the POST route fires generation tasks with `void Promise.all(...)` so it can return immediately. In a Vercel Lambda, the function may terminate after the response is sent before all tasks complete. Use `waitUntil` from `@vercel/functions` to keep the Lambda alive:

```ts
import { waitUntil } from '@vercel/functions';
// replace: void Promise.all(...)
waitUntil(Promise.all(...));
```

## Further reading

- `CLAUDE.md` — architecture, style/prompt conventions, prompt-engineering rules, what not to do.
