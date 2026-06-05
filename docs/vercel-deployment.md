# Vercel Deployment

Vercel is a supported deployment target for the current Next.js application. Supabase Postgres stores relational data and Cloudflare R2 stores durable media. Do not rely on the Vercel function filesystem for generated images, videos, profile photos, collection images, or customer uploads.

## Required External Services

1. Supabase Postgres and Supabase Auth.
2. Cloudflare R2 with a public custom media domain.
3. Gemini or Google AI credentials for pendant image generation.
4. Wavespeed credentials if video generation is enabled.

## Vercel Project Setup

1. Import this GitHub repository into Vercel.
2. Use the Next.js framework preset.
3. Keep the repository root as the Vercel root directory.
4. Use `npm run build` as the build command.
5. Do not add a Vercel persistent filesystem assumption. Durable writes are blocked in production when R2 is missing.

Set these Vercel environment variables for Preview and Production:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://PROJECT_REF.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
SUPABASE_SECRET_KEY="sb_secret_..."
APP_BASE_URL="https://your-domain.example"
NEXT_PUBLIC_APP_URL="https://your-domain.example"
DEFAULT_ACCOUNT_ID="your-public-wizard-account-id"
GOOGLE_API_KEY="..."
WAVESPEED_API_KEY="..."
VIDEO_ACCESS_CODE="..."
VVS_WORKER_SECRET="..."
CRON_SECRET="..."
VVS_INTERNAL_ADMIN_EMAILS="admin@example.com"
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="mvp-jewelry-media"
R2_PUBLIC_BASE_URL="https://media.your-domain.example"
```

`DEFAULT_ACCOUNT_ID` is still required because the root pendant wizard is not yet storefront-aware. Production now fails closed if that value is missing instead of silently writing customer requests to the seeded demo account.

## R2 Browser Upload CORS

Large browser uploads go directly to R2 through short-lived signed `PUT` URLs. Configure bucket CORS for your local, preview, and production origins:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-project.vercel.app",
      "https://your-domain.example"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type", "Cache-Control"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Add each Vercel preview origin you intend to test, or use a controlled preview-domain pattern supported by your R2 CORS configuration. The app never exposes R2 secret keys to the browser.

## Supabase Auth URLs

In Supabase Authentication URL Configuration:

1. Set the production Site URL to `https://your-domain.example`.
2. Add `https://your-domain.example/auth/callback`.
3. Add `https://your-project.vercel.app/auth/callback` for the stable Vercel preview URL.
4. Keep `http://localhost:3000/auth/callback` for local development.

## Background Generation

Generation routes return immediately and the UI polls persisted status rows. On Vercel, those routes now register the existing async work with `waitUntil()` and set `maxDuration = 300`.

VVS Studio video generation uses a persisted Postgres job table and the cron route in `vercel.json`:

```txt
/api/internal/vvs-studio/jobs/process
```

Set `CRON_SECRET` or `VVS_WORKER_SECRET` in Vercel so the worker endpoint is protected. The owner route nudges the worker after a job is created, and cron continues polling Wavespeed until the job is complete. Local development can manually invoke the worker route when no cron is running.

The older pendant video-generation routes still use request-scoped background work. Before higher-volume paid usage, move all provider jobs into the durable worker pattern.

## Deployment Checklist

1. Run `npm run prisma:generate`.
2. Run `npm run supabase:push` only when the target Supabase development schema intentionally needs an update.
3. Run `npm run r2:migrate-generated` to copy existing local media into R2.
4. Run `npm test`.
5. Run `npm run build`.
6. Deploy a Vercel preview.
7. Test login, onboarding, profile image upload, collection image upload, storefront quote image upload, picture pendant generation, revisions, quote sharing, and VVS Studio.
8. Attach the production domain only after preview QA passes.

## Remaining Production Work

- Add rate limiting or bot protection to public presign endpoints before broad public traffic.
- Add cleanup for abandoned `incoming/` uploads and replaced media.
- Replace `DEFAULT_ACCOUNT_ID` with storefront-aware design links.
- Move long-running generation into a durable queue worker.
- Add error tracking, uptime monitoring, and tested backup recovery.

## Dependency Audit Note

Run `npm audit --omit=dev` before each production release. As of June 2, 2026, the remaining reported production advisories are moderate transitive findings in Next's bundled PostCSS and the Google auth `gaxios -> uuid` chain. `npm audit fix --force` proposes unsafe framework changes, so do not apply it blindly. Recheck after upstream package releases.
