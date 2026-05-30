ALTER TABLE "StoreProfile" ADD COLUMN "coverPreset" TEXT;
ALTER TABLE "StoreProfile" ADD COLUMN "coverOverlayOpacity" INTEGER NOT NULL DEFAULT 27;
ALTER TABLE "StoreProfile" ADD COLUMN "coverTextColor" TEXT NOT NULL DEFAULT 'light';
ALTER TABLE "StoreProfile" ADD COLUMN "whatsappPhone" TEXT;
ALTER TABLE "StoreProfile" ADD COLUMN "city" TEXT;
ALTER TABLE "StoreProfile" ADD COLUMN "country" TEXT;
ALTER TABLE "StoreProfile" ADD COLUMN "yearStarted" TEXT;

ALTER TABLE "Product" ADD COLUMN "variantLabelsJson" TEXT;

ALTER TABLE "QuoteRequest" ADD COLUMN "referenceImageUrlsJson" TEXT;
