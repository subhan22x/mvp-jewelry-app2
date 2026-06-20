-- AlterTable
ALTER TABLE "QuoteRequest" ADD COLUMN "publicToken" TEXT;
ALTER TABLE "QuoteRequest" ADD COLUMN "publicTokenCreatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "QuoteRequest_publicToken_key" ON "QuoteRequest"("publicToken");
