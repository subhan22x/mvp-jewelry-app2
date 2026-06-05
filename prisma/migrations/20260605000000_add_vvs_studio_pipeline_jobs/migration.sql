ALTER TABLE "VvsStudioImageGeneration"
  ADD COLUMN IF NOT EXISTS "stage" TEXT DEFAULT 'style_composite',
  ADD COLUMN IF NOT EXISTS "sourceImageGenerationId" TEXT,
  ADD COLUMN IF NOT EXISTS "styleKey" TEXT,
  ADD COLUMN IF NOT EXISTS "providerProfileId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerProfileVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "providerPayloadJson" TEXT;

ALTER TABLE "VvsStudioVideoGeneration"
  ADD COLUMN IF NOT EXISTS "firstImageGenerationId" TEXT,
  ADD COLUMN IF NOT EXISTS "lastImageGenerationId" TEXT,
  ADD COLUMN IF NOT EXISTS "lastImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "styleKey" TEXT,
  ADD COLUMN IF NOT EXISTS "providerProfileId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerProfileVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "providerPayloadJson" TEXT,
  ADD COLUMN IF NOT EXISTS "resolution" TEXT DEFAULT '480p';

CREATE TABLE IF NOT EXISTS "VvsStudioJob" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "shootId" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'video_pipeline',
  "status" TEXT NOT NULL DEFAULT 'queued',
  "currentStage" TEXT NOT NULL DEFAULT 'source_refine',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "lockedAt" TIMESTAMP(3),
  "lockedBy" TEXT,
  "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "error" TEXT,
  "profileSelectionJson" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VvsStudioJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "VvsStudioJob_accountId_createdAt_idx" ON "VvsStudioJob"("accountId", "createdAt");
CREATE INDEX IF NOT EXISTS "VvsStudioJob_accountId_status_idx" ON "VvsStudioJob"("accountId", "status");
CREATE INDEX IF NOT EXISTS "VvsStudioJob_status_runAfter_idx" ON "VvsStudioJob"("status", "runAfter");
CREATE INDEX IF NOT EXISTS "VvsStudioJob_shootId_createdAt_idx" ON "VvsStudioJob"("shootId", "createdAt");

ALTER TABLE "VvsStudioJob"
  ADD CONSTRAINT "VvsStudioJob_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VvsStudioJob"
  ADD CONSTRAINT "VvsStudioJob_shootId_fkey" FOREIGN KEY ("shootId") REFERENCES "VvsStudioShoot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
