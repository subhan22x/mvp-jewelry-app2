BEGIN;

-- AlterTable
ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "notificationAudience" TEXT NOT NULL DEFAULT 'legacy';

-- CreateTable
CREATE TABLE IF NOT EXISTS "OwnerNotification" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "quoteRequestId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "kind" TEXT NOT NULL,
    "deduplicationKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "payloadJson" TEXT,
    "recipient" TEXT,
    "providerMessageId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "firstAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseToken" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "NotificationWebhookEvent" (
    "id" TEXT NOT NULL,
    "providerMessageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OwnerNotification_deduplicationKey_key" ON "OwnerNotification"("deduplicationKey");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OwnerNotification_providerMessageId_key" ON "OwnerNotification"("providerMessageId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OwnerNotification_status_nextAttemptAt_idx" ON "OwnerNotification"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OwnerNotification_accountId_createdAt_idx" ON "OwnerNotification"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NotificationWebhookEvent_providerMessageId_processedAt_idx" ON "NotificationWebhookEvent"("providerMessageId", "processedAt");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"OwnerNotification"'::regclass AND conname = 'OwnerNotification_accountId_fkey') THEN
    ALTER TABLE "OwnerNotification" ADD CONSTRAINT "OwnerNotification_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "OwnerNotification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationWebhookEvent" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "OwnerNotification", "NotificationWebhookEvent" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "OwnerNotification", "NotificationWebhookEvent" FROM authenticated;
  END IF;
END $$;
COMMIT;
