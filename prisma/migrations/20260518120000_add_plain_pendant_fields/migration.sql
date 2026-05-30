ALTER TABLE "Request" ADD COLUMN "pendantFinish" TEXT NOT NULL DEFAULT 'icedout';
ALTER TABLE "Request" ADD COLUMN "plainColor" TEXT;
ALTER TABLE "Request" ADD COLUMN "plainMetal" TEXT;
ALTER TABLE "Request" ADD COLUMN "plainKarat" TEXT;

ALTER TABLE "QuoteRequest" ADD COLUMN "pendantFinish" TEXT;
ALTER TABLE "QuoteRequest" ADD COLUMN "plainColor" TEXT;
ALTER TABLE "QuoteRequest" ADD COLUMN "plainMetal" TEXT;
ALTER TABLE "QuoteRequest" ADD COLUMN "plainKarat" TEXT;
