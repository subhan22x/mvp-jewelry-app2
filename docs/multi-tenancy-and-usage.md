# Public Storefront Multi-Tenancy And Usage Metering

## Tenant URL Model

The public QR design URL is:

```text
/s/:accountSlug/design
```

This is the canonical customer-facing design entrypoint for store owners. The route resolves `:accountSlug` to an active, published `Account` and then renders the shared design flow with tenant-aware links:

- `/s/:accountSlug/design/pendants`
- `/s/:accountSlug/design/pendants/icedout`
- `/s/:accountSlug/design/pendants/nameplates`
- `/s/:accountSlug/design/picture-pendants`
- `/s/:accountSlug/design/pendants/logo`

The older direct builder routes still exist for internal/demo use:

- `/design`
- `/pendants`
- `/name`
- `/picture-pendants`
- `/pendants/nameplates`
- `/pendants/logo`

Public tenant resolution lives in `src/lib/tenant.ts`. Public write APIs should resolve `accountSlug` server-side and must not trust a browser-provided `accountId`.

## Profile Links

Store owners manage the public URLs from `/owner/profile`.

The profile page now shows:

- Public storefront URL: `/s/:accountSlug`
- QR design URL: `/s/:accountSlug/design`

Compatibility routes:

- `/profile` redirects authenticated owners to `/owner/profile`.
- `/profile/:accountSlug` redirects to `/s/:accountSlug`.

## Public Customer Flow

For QR/public traffic, customers enter lead contact details before paid generation starts. That lead is saved against the resolved account through `accountSlug`, and generated `Request`, `Result`, `Lead`, `VideoGeneration`, and `QuoteRequest` rows stay account-scoped.

The write APIs that participate in public design attribution are:

- `/api/requests`
- `/api/picture-requests`
- `/api/leads`
- `/api/quote-requests`
- `/api/videos`

## Usage Metering

Usage metering is based on three models:

- `UsagePlan`: account plan and monthly included limits.
- `AccountUsageBucket`: current monthly usage per account and usage kind.
- `UsageEvent`: immutable, idempotent usage ledger.

The helper in `src/lib/usage.ts` is the single write path for metering:

- `ensureUsageAvailable(accountId, kind, quantity)` checks the current bucket before starting expensive work.
- `consumeUsageCredit(...)` writes an idempotent usage event and increments the monthly bucket.

Usage is charged only for successful customer-visible outputs or successful business events. Failed provider jobs do not consume usage credits.

Current usage kinds:

- `design_image_generated`
- `design_video_generated`
- `design_3d_generated`
- `quote_requested`
- `quote_responded`
- `quote_fulfilled`
- `vvs_video_generated`
- `vvs_product_post_generated`
- `vvs_product_post_fulfilled`

When a monthly bucket is exhausted, APIs return HTTP `402` with `code: "usage_limit_reached"`.

## Quote Milestones

Quote request statuses are:

```text
pending | priced | sent | fulfilled | closed
```

Metered milestones:

- Automatic private quote drafts are not metered. `quote_requested` remains a reserved historical usage key; owner publication is metered as `quote_responded`.
- First transition to `sent`: `quote_responded`
- First transition to `fulfilled`: `quote_fulfilled`

The owner dashboard includes a `Mark Fulfilled` action for sent quotes.

## Owner 3D Model Generation

The experimental owner-only "View in 3D" action is available on succeeded name-pendant results in `/owner`.

Flow:

- `app/owner/View3dButton.tsx` confirms paid provider usage before starting.
- `POST /api/owner/model-jobs` validates the authenticated owner account, result ownership, name-pendant product type, public source image URL, and `design_3d_generated` availability.
- A pending `Model3dGeneration` row is created, then request-scoped background work submits `hyper3d/rodin-v2.5/image-to-3d` through Wavespeed.
- The provider output is downloaded into durable generated-media storage and the row is marked `succeeded` or `failed`.
- `/owner/models/:modelJobId` renders the polling viewer with `<model-viewer>`, GLB download, sharing, and browser AR support.

The first implementation stores one GLB per successful job. Failed jobs do not consume usage credits. Real provider generation requires a public app URL because Wavespeed must fetch the source image over the public internet.
