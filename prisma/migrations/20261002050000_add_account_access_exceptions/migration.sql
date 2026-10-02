-- Manual, account-scoped complimentary access. These rows are audit history:
-- revocation marks a row inactive instead of deleting it.
CREATE TABLE "AccountAccessException" (
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

ALTER TABLE "AccountAccessException"
  ADD CONSTRAINT "AccountAccessException_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "AccountAccessException_accountId_createdAt_idx"
  ON "AccountAccessException"("accountId", "createdAt");
CREATE INDEX "AccountAccessException_accountId_revokedAt_expiresAt_idx"
  ON "AccountAccessException"("accountId", "revokedAt", "expiresAt");
CREATE UNIQUE INDEX "AccountAccessException_activeAccountId_key"
  ON "AccountAccessException"("activeAccountId");
