-- Add account-level Stripe subscription state for the owner Account page and entitlement gates.
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "subscriptionPlanKey" TEXT;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "stripeProductId" TEXT;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "subscriptionCurrentPeriodEnd" TIMESTAMP(3);
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "billingIssueStartedAt" TIMESTAMP(3);
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "billingUpdatedAt" TIMESTAMP(3);
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "hasUsedTrial" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "StripeWebhookEvent" (
  "id" TEXT NOT NULL,
  "stripeEventId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "accountId" TEXT,
  "payloadJson" TEXT,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StripeWebhookEvent_stripeEventId_key" ON "StripeWebhookEvent"("stripeEventId");
CREATE INDEX IF NOT EXISTS "StripeWebhookEvent_accountId_processedAt_idx" ON "StripeWebhookEvent"("accountId", "processedAt");
CREATE INDEX IF NOT EXISTS "StripeWebhookEvent_type_processedAt_idx" ON "StripeWebhookEvent"("type", "processedAt");
