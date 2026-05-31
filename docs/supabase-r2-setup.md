# Supabase And R2 Setup

## Current State

The app still uses SQLite in `prisma/schema.prisma`.

Supabase connection strings have been added to `.env.local`, but Prisma CLI usually loads `.env` by default. Do not paste database passwords into tracked docs or chat.

## Important Migration Note

The existing `prisma/migrations/` history was created for SQLite.

Do not blindly change `provider = "sqlite"` to `provider = "postgresql"` and run `prisma migrate deploy`; the migration history needs to be reset/squashed or recreated for Postgres first.

Safe options:

1. For early Supabase testing, use `prisma db push` against the Postgres schema after switching the datasource.
2. For production, create a clean Postgres migration baseline before real data exists.

This repo currently supports the early Supabase testing path with:

```bash
npm run supabase:push
npm run supabase:migrate-metadata
npm run supabase:audit
```

`supabase:push` creates/updates the schema from `prisma/schema.postgres.prisma`.

`supabase:migrate-metadata` copies SQLite metadata rows into Supabase/Postgres in dependency order, including revisions, reviews, and VVS Studio rows. The copy runs in a transaction and verifies every migrated source key before committing. It does not upload generated media to R2.

`supabase:audit` compares table row counts between the canonical local SQLite source and Supabase/Postgres. By default, migration scripts read SQLite from `prisma/dev.db`. Override that only when needed:

```env
SQLITE_SOURCE_DATABASE_URL="file:/absolute/path/to/source.db"
```

The clean Postgres baseline SQL generated from the current schema lives at:

```text
prisma/postgres-baseline/0001_initial.sql
```

Use the baseline for a fresh production Supabase project. `supabase:push` remains useful while iterating against an early development project.

After R2 is configured, run:

```bash
npm run r2:migrate-generated
```

`r2:migrate-generated` uploads files from `public/generated` or `GENERATED_IMAGE_DIR` to R2, then rewrites generated media URLs in both SQLite and Supabase/Postgres where matching rows exist.

The preferred production path is:

1. Finish the account/auth/data model shape locally.
2. Switch Prisma datasource to Postgres.
3. Create a clean initial Postgres migration.
4. Apply it to Supabase.
5. Seed the demo account/admin.
6. Use future migrations normally from there.

## Runtime Switch Checklist

The schema sync and metadata copy do not automatically switch the running app from SQLite to Postgres. Keep that as a separate reviewed change:

1. Confirm `npm run supabase:audit` reports matching counts.
2. Archive the SQLite source before changing runtime configuration.
3. Make `prisma/schema.prisma` use the Postgres datasource and keep a separate SQLite schema only for archived-data migration utilities.
4. Regenerate Prisma Client from the Postgres runtime schema.
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

## Target Prisma Datasource

When the migration history is ready for Postgres, the datasource should become:

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

The database should store R2 metadata in `MediaAsset`, not raw files.

- `R2_ACCOUNT_ID` is your Cloudflare account ID.
- `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` come from an R2 API token with object read/write access to the bucket.
- `R2_BUCKET_NAME` is the bucket that stores generated media.
- `R2_ENDPOINT` is optional if `R2_ACCOUNT_ID` is present. When omitted, the app uses `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`.
- `R2_PUBLIC_BASE_URL` must be a public bucket URL or custom domain with no trailing slash.

When R2 is fully configured, new generated images and downloaded videos are stored at keys like:

```text
generated/<file-name>
```

The current implementation stores public R2 URLs directly on `Result.imageUrl`, `VideoGeneration.videoUrl`, and quote snapshot URL fields. The longer-term data model should move this into `MediaAsset` rows with `provider = r2`, `storageKey`, content metadata, and owner references.
