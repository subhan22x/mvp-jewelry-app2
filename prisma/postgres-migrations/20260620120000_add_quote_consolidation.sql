-- ============================================================================
-- Migration: add_quote_consolidation (Postgres only)
-- ----------------------------------------------------------------------------
-- Consolidates the QuoteRequest domain for the unified quote flow.
--
--   * Add QuoteRequest.model3dId, QuoteRequest.resultRevisionId, and
--     QuoteRequest.previewMediaType (default 'image').
--   * Set QuoteRequest.previewMediaType = 'video' where a video is attached.
--   * Attach the newest successful Model3dGeneration matching the selected
--     result where possible.
--   * Set QuoteRequest.previewMediaType = 'model3d' where a model is attached.
--   * Detach older duplicate QuoteRequest rows that share a non-null requestId
--     (set requestId = NULL on the older duplicates; keep the newest per
--     requestId). Historical rows are preserved, never deleted.
--   * Create the nullable-unique index on QuoteRequest.requestId. Postgres
--     treats NULLs as distinct in a unique index, so multiple NULL requestIds
--     (e.g. general storefront quotes) remain allowed.
--   * Add foreign keys for the new model3dId / resultRevisionId relations.
--   * Backfill missing eligible draft QuoteRequest rows from Request/Result/
--     Lead using the latest lead (nonempty name/phone/email) and the preferred
--     succeeded result (variant 1 with image preferred).
--
-- This project manages the Postgres schema with `prisma db push`; this script
-- performs the data backfill and constraint creation that db push does not.
-- Run it manually against the Supabase/Postgres database. It is idempotent and
-- safe to re-run. Identifier convention: quoted PascalCase, matching existing
-- migrations. gen_random_uuid() is built into Postgres 13+ (Supabase PG15+).
-- ============================================================================

BEGIN;

ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "diamondQuality" TEXT;

-- 1. Add new columns to QuoteRequest.
ALTER TABLE "QuoteRequest" ADD COLUMN IF NOT EXISTS "model3dId" TEXT;
ALTER TABLE "QuoteRequest" ADD COLUMN IF NOT EXISTS "resultRevisionId" TEXT;
ALTER TABLE "QuoteRequest" ADD COLUMN IF NOT EXISTS "previewMediaType" TEXT NOT NULL DEFAULT 'image';

-- 2. previewMediaType = 'video' where a video is attached.
--    (Rows that a previous run already promoted to 'model3d' are left alone;
--    step 4 re-promotes any model3d rows after model attachment.)
UPDATE "QuoteRequest"
SET "previewMediaType" = 'video'
WHERE "videoId" IS NOT NULL
  AND COALESCE("previewMediaType", 'image') <> 'model3d';

-- 3. Attach the newest successful Model3dGeneration matching the selected
--    result. Deterministic via ORDER BY ... LIMIT 1 in the scalar subquery.
UPDATE "QuoteRequest" AS q
SET "model3dId" = (
  SELECT m."id"
  FROM "Model3dGeneration" AS m
  WHERE m."sourceResultId" = q."resultId"
    AND m."accountId" = q."accountId"
    AND m."sourceImageUrl" = q."designedImageUrl"
    AND m."status" = 'succeeded'
    AND m."modelUrl" IS NOT NULL
  ORDER BY m."createdAt" DESC, m."id" DESC
  LIMIT 1
)
WHERE q."resultId" IS NOT NULL
  AND q."videoId" IS NULL
  AND q."model3dId" IS NULL
  AND EXISTS (
    SELECT 1 FROM "Model3dGeneration" AS m
    WHERE m."sourceResultId" = q."resultId"
      AND m."accountId" = q."accountId"
      AND m."sourceImageUrl" = q."designedImageUrl"
      AND m."status" = 'succeeded'
      AND m."modelUrl" IS NOT NULL
  );

-- 4. previewMediaType = 'model3d' where a model is now attached.
UPDATE "QuoteRequest"
SET "previewMediaType" = 'model3d'
WHERE "model3dId" IS NOT NULL
  AND "videoId" IS NULL;

-- 5. Detach older duplicate QuoteRequest rows that share a non-null requestId.
--    Keep the newest quote per requestId (createdAt DESC, then id DESC); null
--    out requestId on the older duplicates. Historical rows are preserved.
WITH ranked AS (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY "requestId"
           ORDER BY "createdAt" DESC, "id" DESC
         ) AS rn
  FROM "QuoteRequest"
  WHERE "requestId" IS NOT NULL
)
UPDATE "QuoteRequest" AS q
SET "requestId" = NULL
FROM ranked
WHERE q."id" = ranked."id"
  AND ranked.rn > 1;

-- 6. Create the nullable-unique index on QuoteRequest.requestId.
--    Index name matches Prisma's @unique convention so db push detects it.
CREATE UNIQUE INDEX IF NOT EXISTS "QuoteRequest_requestId_key"
  ON "QuoteRequest"("requestId");

-- 7. Add foreign keys for the new relations (ON DELETE SET NULL).
--    Constraint names match Prisma's convention so db push detects them.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuoteRequest_model3dId_fkey'
  ) THEN
    ALTER TABLE "QuoteRequest"
      ADD CONSTRAINT "QuoteRequest_model3dId_fkey"
      FOREIGN KEY ("model3dId") REFERENCES "Model3dGeneration"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuoteRequest_resultRevisionId_fkey'
  ) THEN
    ALTER TABLE "QuoteRequest"
      ADD CONSTRAINT "QuoteRequest_resultRevisionId_fkey"
      FOREIGN KEY ("resultRevisionId") REFERENCES "ResultRevision"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 8. Backfill missing eligible draft QuoteRequest rows.
--    Eligibility: a Request with at least one succeeded Result AND a linked
--    Lead with nonempty name/phone/email, and no existing QuoteRequest for
--    that requestId. Uses the latest eligible lead and the preferred succeeded
--    result (variant 1 with image preferred, else any succeeded with image).
--    Draft quotes: status 'pending', previewMediaType
--    'image'.
INSERT INTO "QuoteRequest" (
  "id", "accountId", "requestId", "resultId",
  "designedImageUrl", "generatedAt",
  "productType", "pendantFinish", "styleId", "text",
  "twoTone", "primaryMetal", "secondaryMetal", "emblem",
  "size", "metalType", "stoneType",
  "plainColor", "plainMetal", "plainKarat", "plainChain",
  "diamondQuality", "customerName", "customerPhone", "customerEmail",
  "previewMediaType", "status", "createdAt"
)
SELECT
  gen_random_uuid()::text,
  r."accountId",
  r."id",
  pref."resultId",
  pref."imageUrl",
  COALESCE(pref."completedAt", pref."resultCreatedAt", r."createdAt"),
  r."productType", r."pendantFinish", r."styleId", r."text",
  r."twoTone", r."primaryMetal", r."secondaryMetal", r."emblem",
  r."size", r."metalType", r."stoneType",
  r."plainColor", r."plainMetal", r."plainKarat", r."plainChain",
  r."diamondQuality", l."name", l."phone", l."email",
  'image', 'pending',
  NOW()
FROM "Request" AS r
JOIN LATERAL (
  SELECT l0."name", l0."phone", l0."email"
  FROM "Lead" AS l0
  WHERE l0."accountId" = r."accountId"
    AND l0."requestId" = r."id"
    AND COALESCE(l0."name", '') <> ''
    AND COALESCE(l0."phone", '') <> ''
    AND COALESCE(l0."email", '') <> ''
  ORDER BY l0."createdAt" DESC, l0."id" DESC
  LIMIT 1
) AS l ON TRUE
JOIN LATERAL (
  SELECT s."id" AS "resultId", s."imageUrl", s."completedAt", s."createdAt" AS "resultCreatedAt"
  FROM "Result" AS s
  WHERE s."requestId" = r."id"
    AND s."status" = 'succeeded'
    AND COALESCE(s."imageUrl", '') <> ''
  ORDER BY
    CASE WHEN s."variant" = 1 THEN 0 ELSE 1 END,
    CASE WHEN COALESCE(s."imageUrl", '') <> '' THEN 0 ELSE 1 END,
    s."completedAt" DESC NULLS LAST,
    s."createdAt" DESC,
    s."id" DESC
  LIMIT 1
) AS pref ON TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM "QuoteRequest" AS q
  WHERE q."requestId" = r."id"
);

COMMIT;
