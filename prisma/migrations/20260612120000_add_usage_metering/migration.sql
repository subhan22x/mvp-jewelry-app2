-- CreateTable
CREATE TABLE "UsagePlan" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "planKey" TEXT NOT NULL DEFAULT 'starter',
    "limitsJson" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsagePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountUsageBucket" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL,
    "included" INTEGER NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountUsageBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsagePlan_accountId_startsAt_idx" ON "UsagePlan"("accountId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccountUsageBucket_accountId_periodStart_kind_key" ON "AccountUsageBucket"("accountId", "periodStart", "kind");

-- CreateIndex
CREATE INDEX "AccountUsageBucket_accountId_periodStart_idx" ON "AccountUsageBucket"("accountId", "periodStart");

-- CreateIndex
CREATE INDEX "AccountUsageBucket_accountId_kind_idx" ON "AccountUsageBucket"("accountId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "UsageEvent_idempotencyKey_key" ON "UsageEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "UsageEvent_accountId_createdAt_idx" ON "UsageEvent"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "UsageEvent_accountId_kind_idx" ON "UsageEvent"("accountId", "kind");

-- CreateIndex
CREATE INDEX "UsageEvent_sourceType_sourceId_idx" ON "UsageEvent"("sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "UsagePlan" ADD CONSTRAINT "UsagePlan_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountUsageBucket" ADD CONSTRAINT "AccountUsageBucket_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
