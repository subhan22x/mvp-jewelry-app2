-- Manual, account-scoped complimentary access. These rows are audit history:
-- revocation marks a row inactive instead of deleting it.
CREATE TABLE IF NOT EXISTS "AccountAccessException" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "activeAccountId" TEXT,
    "reason" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,

    CONSTRAINT "AccountAccessException_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"AccountAccessException"'::regclass AND conname = 'AccountAccessException_accountId_fkey') THEN
ALTER TABLE "AccountAccessException"
  ADD CONSTRAINT "AccountAccessException_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END IF;
END $$;

CREATE INDEX IF NOT EXISTS "AccountAccessException_accountId_createdAt_idx"
  ON "AccountAccessException"("accountId", "createdAt");
CREATE INDEX IF NOT EXISTS "AccountAccessException_accountId_revokedAt_expiresAt_idx"
  ON "AccountAccessException"("accountId", "revokedAt", "expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "AccountAccessException_activeAccountId_key"
  ON "AccountAccessException"("activeAccountId");

-- Audit data is accessed only through server-authorized Prisma queries.
ALTER TABLE "AccountAccessException" ENABLE ROW LEVEL SECURITY;
