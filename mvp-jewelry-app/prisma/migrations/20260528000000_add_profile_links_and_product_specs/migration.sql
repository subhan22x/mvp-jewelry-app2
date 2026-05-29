ALTER TABLE "StoreProfile" ADD COLUMN "websiteUrl" TEXT;
ALTER TABLE "StoreProfile" ADD COLUMN "extraLinksJson" TEXT;

ALTER TABLE "Product" ADD COLUMN "category" TEXT;
ALTER TABLE "Product" ADD COLUMN "priceMode" TEXT;
ALTER TABLE "Product" ADD COLUMN "material" TEXT;
ALTER TABLE "Product" ADD COLUMN "metalDetail" TEXT;
ALTER TABLE "Product" ADD COLUMN "stoneQuality" TEXT;
ALTER TABLE "Product" ADD COLUMN "weightLabel" TEXT;
