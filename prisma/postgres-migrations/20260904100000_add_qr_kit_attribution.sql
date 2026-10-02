CREATE TABLE IF NOT EXISTS "QrKitBatch" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "printTemplateVersion" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QrKitBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QrKitBatch_code_key" UNIQUE ("code"),
  CONSTRAINT "QrKitBatch_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "QrKit" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "displayCode" TEXT NOT NULL,
  "publicToken" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'available',
  "accountId" TEXT,
  "assignedAt" TIMESTAMP(3),
  "deployedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QrKit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QrKit_displayCode_key" UNIQUE ("displayCode"),
  CONSTRAINT "QrKit_publicToken_key" UNIQUE ("publicToken"),
  CONSTRAINT "QrKit_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "QrKitBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "QrKit_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "QrKit_status_check" CHECK ("status" IN ('available', 'assigned', 'suspended', 'lost', 'retired'))
);

CREATE TABLE IF NOT EXISTS "QrKitEvent" (
  "id" TEXT NOT NULL,
  "qrKitId" TEXT NOT NULL,
  "accountId" TEXT,
  "actorUserId" TEXT,
  "type" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QrKitEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QrKitEvent_qrKitId_fkey" FOREIGN KEY ("qrKitId") REFERENCES "QrKit"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "QrKitEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "QrKitEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "QrKitEvent_type_check" CHECK ("type" IN ('created', 'assigned', 'deployed', 'suspended', 'reactivated', 'marked_lost', 'retired', 'reset'))
);

ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "qrKitId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "qrKitId" TEXT;
ALTER TABLE "QuoteRequest" ADD COLUMN IF NOT EXISTS "qrKitId" TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Request_qrKitId_fkey') THEN
    ALTER TABLE "Request" ADD CONSTRAINT "Request_qrKitId_fkey" FOREIGN KEY ("qrKitId") REFERENCES "QrKit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Lead_qrKitId_fkey') THEN
    ALTER TABLE "Lead" ADD CONSTRAINT "Lead_qrKitId_fkey" FOREIGN KEY ("qrKitId") REFERENCES "QrKit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuoteRequest_qrKitId_fkey') THEN
    ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_qrKitId_fkey" FOREIGN KEY ("qrKitId") REFERENCES "QrKit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "QrKitBatch_createdAt_idx" ON "QrKitBatch"("createdAt");
CREATE INDEX IF NOT EXISTS "QrKit_batchId_idx" ON "QrKit"("batchId");
CREATE INDEX IF NOT EXISTS "QrKit_status_accountId_idx" ON "QrKit"("status", "accountId");
CREATE INDEX IF NOT EXISTS "QrKitEvent_qrKitId_createdAt_idx" ON "QrKitEvent"("qrKitId", "createdAt");
CREATE INDEX IF NOT EXISTS "QrKitEvent_accountId_createdAt_idx" ON "QrKitEvent"("accountId", "createdAt");
CREATE INDEX IF NOT EXISTS "Request_qrKitId_createdAt_idx" ON "Request"("qrKitId", "createdAt");
CREATE INDEX IF NOT EXISTS "Lead_qrKitId_createdAt_idx" ON "Lead"("qrKitId", "createdAt");
CREATE INDEX IF NOT EXISTS "QuoteRequest_qrKitId_createdAt_idx" ON "QuoteRequest"("qrKitId", "createdAt");

ALTER TABLE "QrKitBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QrKit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QrKitEvent" ENABLE ROW LEVEL SECURITY;
