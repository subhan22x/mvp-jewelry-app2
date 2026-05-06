# Pendant MVP

A custom jewelry pendant ideation web app. A store employee or customer enters a name, picks a style, emblem, and gold finish; the app calls Gemini to generate two AI image previews so the customer can pick a favorite before ordering.

The app is **not** a CAD tool, checkout system, or manufacturing pipeline. It is a fast visualizer. Success = "yes, that's close to what I want."

## Status

- **Working flow:** Name pendant only.
- **Disabled placeholders on home:** Logo, Picture Pendants, Custom Design, Get Inspired, Draw Your Design.
- **Single-tenant:** all requests are scoped to a hardcoded `demo` user.

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
# VIDEO_DURATION_SECONDS=7
# APP_BASE_URL=https://your-public-app-url.example
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
VIDEO_DURATION_SECONDS=7
APP_BASE_URL=https://your-render-service.onrender.com
```

Generated files are served through `/generated/:file`, so `GENERATED_IMAGE_DIR` can point at Render's persistent disk instead of `public/generated`.

For a larger production setup, migrate from SQLite to Postgres and move generated files to object storage such as S3/R2. The Render disk setup is intentionally the quick MVP path.

## Environment variables

| Variable               | Default                              | Purpose                                       |
| ---------------------- | ------------------------------------ | --------------------------------------------- |
| `GEMINI_API_KEY`       | (required)                           | Gemini auth. `IMAGE_API_KEY` is a fallback.   |
| `GEMINI_MODEL_ID`      | `gemini-3.1-flash-image-preview`     | Model used by the connector.                  |
| `GENERATED_IMAGE_DIR`  | `public/generated`                   | Where generated images are written.           |
| `WAVESPEED_API_KEY`    | (required for videos)                | Wavespeed auth for Seedance video generation. |
| `VIDEO_ACCESS_CODE`    | (required for videos)                | Internal code required before video generation. |
| `VIDEO_DURATION_SECONDS` | `7`                                | Seedance video duration, clamped from 4-15 seconds. |
| `VIDEO_RESOLUTION`     | `720p`                               | Seedance output resolution: `480p`, `720p`, or `1080p`. |
| `VIDEO_PROMPT`         | built-in fallback                    | Optional exact prompt sent to Seedance.       |
| `APP_BASE_URL`         | (required for videos)                | Public base URL used so Wavespeed can fetch generated images. |

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
| `npm run styles`          | Manage `data/pendant-styles.json` via script          |
| `npm run build:widget`   | Build the embeddable pendant widget to `public/embed/` |

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
  api/requests/route.ts      # POST /api/requests — creates a Request and fires 2 async generation tasks
  api/requests/[id]/route.ts # GET — poll for results; returns {results, done}
  api/quote-requests/route.ts # POST — persists the customer quote/admin handoff snapshot

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
  generated/                 # generated images output (dev only)
```

The folders `lib/styles/` and `server/db/client.ts` are currently re-export shims pointing at `src/`. See `CLAUDE.md` for why and when they get removed.

## Production notes

**Generated images** — `public/generated/` is local-only. Vercel/Netlify filesystems are ephemeral; production deployments need object storage (R2, S3, Supabase, Cloudinary) wired into `connector.ts`.

**Background tasks on Vercel** — the POST route fires generation tasks with `void Promise.all(...)` so it can return immediately. In a Vercel Lambda, the function may terminate after the response is sent before all tasks complete. Use `waitUntil` from `@vercel/functions` to keep the Lambda alive:

```ts
import { waitUntil } from '@vercel/functions';
// replace: void Promise.all(...)
waitUntil(Promise.all(...));
```

## Further reading

- `CLAUDE.md` — architecture, style/prompt conventions, prompt-engineering rules, what not to do.

## Embeddable Widget

A framework-free, lightweight pendant builder widget that can be embedded on any website (Shopify, Wix, Webflow, WordPress, or plain HTML).

### Architecture

- **Source:** TypeScript in `src/widget/`
- **Output:** Plain JS bundle in `public/embed/pendant-builder.js`
- **UI:** Web Component (`<pendant-builder>`) with Shadow DOM scoped CSS
- **Backend:** The existing Next.js API routes serve as the widget's backend
- **No dependencies:** No React, Next.js, or Tailwind inside the widget runtime

### Quick Start

```bash
# Build the widget
npm run build:widget

# Preview it (requires dev server running)
npm run dev
# Then open http://localhost:3000/embed-preview
```

### Embed Snippet

```html
<script src="https://YOUR_DOMAIN.com/embed/pendant-builder.js"></script>

<pendant-builder
  store-id="demo"
  api-base="https://YOUR_DOMAIN.com"
  mode="pendants">
</pendant-builder>
```

### Imperative Mount

```html
<div id="pendant-builder"></div>
<script src="https://YOUR_DOMAIN.com/embed/pendant-builder.js"></script>
<script>
  PendantBuilder.mount("#pendant-builder", {
    storeId: "demo",
    apiBase: "https://YOUR_DOMAIN.com",
    mode: "pendants"
  });
</script>
```

### Configuration

| Attribute   | JS Option    | Default               | Description                          |
| ----------- | ------------ | --------------------- | ------------------------------------ |
| `store-id`  | `storeId`    | `"demo"`              | Tenant/store identifier              |
| `api-base`  | `apiBase`    | current origin        | Backend API base URL                 |
| `mode`      | `mode`       | `"pendants"`          | Start screen: `"pendants"`, `"name"`, or `"picture"` |
| `theme`     | `theme`      | `"warm-brown"`        | Visual theme                         |

### WordPress / Shopify / Wix Notes

- Add the `<script>` tag in your site's custom code/header injection area
- Place `<pendant-builder ...>` wherever you want the builder to appear
- The widget auto-fits width: 100% of its container; wrap it in a responsive container

### Production Notes

- Serve `public/embed/pendant-builder.js` from your app domain or a CDN
- Configure CORS headers on the API routes (already set to `*` for MVP; tighten for production)
- Tenant config should eventually be keyed by `store-id` (currently hardcoded to `demo`)
- Never expose API keys in the widget — all calls go through the Next.js backend
- Add domain allowlist per store in production

