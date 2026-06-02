# Supabase And R2 Setup

## Current State

The application runtime uses Supabase/Postgres in `prisma/schema.prisma`.

The archived SQLite schema remains in `prisma/schema.sqlite.prisma` for migration and audit utilities. The canonical archived local source defaults to `prisma/dev.db`.

Schema file roles:

- `prisma/schema.prisma`: canonical runtime Prisma schema.
- `prisma/schema.postgres.prisma`: Postgres mirror consumed by `npm run supabase:push`.
- `prisma/schema.sqlite.prisma`: SQLite mirror used to generate the archived-source client.
- `src/server/db/schema.prisma` and `src/server/db/schema.sqlite.prisma`: retained mirrors for compatibility with earlier code paths. Keep them synchronized until they are removed deliberately.

Supabase connection strings belong in `.env.local`. Do not paste database passwords into tracked docs or chat.

## Important Migration Note

The existing `prisma/migrations/` history was created for SQLite and remains as archive history.

Do not blindly change `provider = "sqlite"` to `provider = "postgresql"` and run `prisma migrate deploy`; the migration history needs to be reset/squashed or recreated for Postgres first.

Safe options:

1. For early Supabase testing, use `prisma db push` against the Postgres schema after switching the datasource.
2. For production, create a clean Postgres migration baseline before real data exists.

This repo currently supports the early Supabase testing path with:

```bash
npm run supabase:push
npm run supabase:migrate-metadata
npm run supabase:audit
npm run supabase:audit-rls
```

`supabase:push` creates/updates the schema from `prisma/schema.postgres.prisma`.

`supabase:migrate-metadata` copies archived SQLite rows into Supabase/Postgres in dependency order, including revisions, reviews, and VVS Studio rows. The historical script name is retained even though it copies application rows, not only metadata. The copy runs in a transaction and verifies every migrated source key before committing. It does not upload generated media to R2.

`supabase:audit` compares table row counts between the canonical local SQLite source and Supabase/Postgres. By default, migration scripts read SQLite from `prisma/dev.db`. Override that only when needed:

```env
SQLITE_SOURCE_DATABASE_URL="file:/absolute/path/to/source.db"
```

`supabase:audit-rls` verifies that public application tables keep Row Level Security enabled without direct browser-access policies. The current application reads and writes through server-side Prisma routes rather than Supabase PostgREST, so browser roles should not receive table policies.

The clean Postgres baseline SQL generated from the current schema lives at:

```text
prisma/postgres-baseline/0001_initial.sql
```

Use the baseline for a fresh production Supabase project. `supabase:push` remains useful while iterating against an early development project.

Regenerate the baseline after intentional schema changes:

```bash
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/postgres-baseline/0001_initial.sql
```

Review the generated SQL before using it on a fresh project.

After R2 is configured, run:

```bash
npm run r2:migrate-generated
```

`r2:migrate-generated` uploads files from `public/generated` or `GENERATED_IMAGE_DIR` to R2, then rewrites generated media URLs in both SQLite and Supabase/Postgres where matching rows exist.

The production transition path is:

1. Keep `prisma/schema.prisma` as the Postgres runtime schema.
2. Use `prisma/postgres-baseline/0001_initial.sql` for a clean production baseline.
3. Apply schema changes to the current development project with `npm run supabase:push`.
4. Copy archived SQLite metadata with `npm run supabase:migrate-metadata`.
5. Confirm counts with `npm run supabase:audit`.
6. Seed the demo account/admin.
7. Establish normal Postgres migrations before onboarding paid production accounts.

## Runtime Switch Checklist

The running app now uses Postgres. Keep deployment verification separate from archived SQLite cleanup:

1. Confirm `npm run supabase:audit` reports matching counts.
2. Archive the SQLite source before changing runtime configuration.
3. Keep `prisma/schema.sqlite.prisma` only for archived-data migration utilities.
4. Regenerate Prisma Client from the Postgres runtime schema with `npm run prisma:generate`.
5. Run the app locally with Supabase `DATABASE_URL` and `DIRECT_URL`.
6. Verify onboarding, profile editing, collections, reviews, quote requests, revisions, and VVS Studio persistence.
7. Deploy with Postgres environment variables and remove SQLite disk assumptions from the production start command.

Do not combine the runtime switch with destructive cleanup of local SQLite files. Keep the archived source until production verification is complete.

## Supabase Environment Variables

Supabase provides:

```env
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.PROJECT_REF:PASSWORD@...pooler.supabase.com:5432/postgres"
```

For Prisma:

- `DATABASE_URL` is the pooled runtime connection.
- `DIRECT_URL` is used for migrations.
- Replace the password placeholder in both strings before running the scripts.
- If the password contains special URL characters like `@`, `#`, `%`, `/`, `?`, or `:`, URL-encode it before placing it in the connection string.

Supabase Auth also requires:

```env
NEXT_PUBLIC_SUPABASE_URL="https://PROJECT_REF.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
SUPABASE_SECRET_KEY="sb_secret_..."
```

- The publishable key is browser-safe and is used for signup and login.
- The secret key is server-only and must never use a `NEXT_PUBLIC_` prefix.
- Configure the Supabase Authentication URL settings so confirmation emails can return to `/auth/callback`.
- Add both local and deployed callback URLs before testing onboarding in each environment.

## Runtime Prisma Datasource

The runtime datasource is already:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## Cloudflare R2 Environment Variables

Variables:

```env
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME="mvp-jewelry-media"
R2_ENDPOINT=""
R2_PUBLIC_BASE_URL=""
```

The current schema stores public media URLs on the owning rows. A later production-hardening pass should add a `MediaAsset` model so storage keys and metadata are managed centrally.

- `R2_ACCOUNT_ID` is your Cloudflare account ID.
- `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` come from an R2 API token with object read/write access to the bucket.
- `R2_BUCKET_NAME` is the bucket that stores generated media.
- `R2_ENDPOINT` is optional if `R2_ACCOUNT_ID` is present. When omitted, the app uses `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`.
- `R2_PUBLIC_BASE_URL` must be a public bucket URL or custom domain with no trailing slash.
- Production requests fail closed when R2 is not configured. Local development may still use `GENERATED_IMAGE_DIR`.
- Browser uploads use short-lived signed `PUT` URLs so larger images bypass Vercel function request-body limits. Configure the R2 CORS policy in [`vercel-deployment.md`](vercel-deployment.md).
- New direct browser uploads are stored under `incoming/`. Add lifecycle cleanup for abandoned keys before broad public traffic.

When R2 is fully configured, new generated images and downloaded videos are stored at keys like:

```text
generated/<file-name>
```

The current implementation stores public R2 URLs directly on `Result.imageUrl`, `VideoGeneration.videoUrl`, and quote snapshot URL fields. The longer-term data model should move this into `MediaAsset` rows with `provider = r2`, `storageKey`, content metadata, and owner references.

## Remaining Production Blockers

The Postgres runtime switch is complete, but production hardening is not:

1. Run `npm run r2:migrate-generated` before production cutover.
2. Configure a custom R2 media domain instead of an `r2.dev` URL.
3. Add cleanup for abandoned `incoming/` uploads and replaced media.
4. Establish normal Postgres migrations before onboarding paid production accounts. The current `supabase:push` workflow is for early development only.
5. Complete password reset and replace `DEFAULT_ACCOUNT_ID` with storefront-aware customer-generation links.
6. Add a persistent generation queue before higher-volume paid usage.
