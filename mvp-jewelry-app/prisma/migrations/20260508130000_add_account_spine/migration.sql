CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "themeKey" TEXT NOT NULL DEFAULT 'classic_black_gold',
    "status" TEXT NOT NULL DEFAULT 'active',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AccountMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountMembership_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AccountMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "Account" ("id", "name", "slug", "themeKey", "status", "createdAt", "updatedAt")
VALUES ('demo-account', 'Demo Store', 'demo', 'classic_black_gold', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO "User" ("id", "storeName", "createdAt")
VALUES ('demo', 'Demo Store', CURRENT_TIMESTAMP);

INSERT INTO "AccountMembership" ("id", "accountId", "userId", "role", "status", "createdAt", "updatedAt")
VALUES ('demo-account-owner', 'demo-account', 'demo', 'owner', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "name" TEXT;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'store_owner';

ALTER TABLE "Request" ADD COLUMN "accountId" TEXT NOT NULL DEFAULT 'demo-account';
ALTER TABLE "Result" ADD COLUMN "accountId" TEXT NOT NULL DEFAULT 'demo-account';
ALTER TABLE "Lead" ADD COLUMN "accountId" TEXT NOT NULL DEFAULT 'demo-account';
ALTER TABLE "VideoGeneration" ADD COLUMN "accountId" TEXT NOT NULL DEFAULT 'demo-account';
ALTER TABLE "QuoteRequest" ADD COLUMN "accountId" TEXT NOT NULL DEFAULT 'demo-account';
ALTER TABLE "AppSetting" ADD COLUMN "accountId" TEXT NOT NULL DEFAULT 'demo-account';

CREATE UNIQUE INDEX "Account_slug_key" ON "Account"("slug");
CREATE UNIQUE INDEX "Account_stripeCustomerId_key" ON "Account"("stripeCustomerId");
CREATE UNIQUE INDEX "Account_stripeSubscriptionId_key" ON "Account"("stripeSubscriptionId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "AccountMembership_accountId_userId_key" ON "AccountMembership"("accountId", "userId");
CREATE INDEX "AccountMembership_userId_idx" ON "AccountMembership"("userId");
CREATE INDEX "Request_accountId_createdAt_idx" ON "Request"("accountId", "createdAt");
CREATE INDEX "Result_accountId_createdAt_idx" ON "Result"("accountId", "createdAt");
CREATE INDEX "Result_accountId_status_idx" ON "Result"("accountId", "status");
CREATE INDEX "Lead_accountId_createdAt_idx" ON "Lead"("accountId", "createdAt");
CREATE INDEX "VideoGeneration_accountId_createdAt_idx" ON "VideoGeneration"("accountId", "createdAt");
CREATE INDEX "VideoGeneration_accountId_status_idx" ON "VideoGeneration"("accountId", "status");
CREATE INDEX "QuoteRequest_accountId_createdAt_idx" ON "QuoteRequest"("accountId", "createdAt");
CREATE INDEX "QuoteRequest_accountId_status_idx" ON "QuoteRequest"("accountId", "status");
CREATE INDEX "AppSetting_accountId_idx" ON "AppSetting"("accountId");
