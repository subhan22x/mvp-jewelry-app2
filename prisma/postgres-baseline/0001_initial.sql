-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'store_owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "themeKey" TEXT NOT NULL DEFAULT 'classic_black_gold',
    "status" TEXT NOT NULL DEFAULT 'active',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AccountMembership" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Request" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountId" TEXT NOT NULL DEFAULT 'demo-account',
    "userId" TEXT NOT NULL,
    "productType" TEXT NOT NULL DEFAULT 'name',
    "pendantFinish" TEXT NOT NULL DEFAULT 'icedout',
    "styleId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "twoTone" BOOLEAN NOT NULL DEFAULT false,
    "primaryMetal" TEXT NOT NULL,
    "secondaryMetal" TEXT,
    "emblem" TEXT NOT NULL,
    "size" TEXT,
    "metalType" TEXT,
    "stoneType" TEXT,
    "plainColor" TEXT,
    "plainMetal" TEXT,
    "plainKarat" TEXT,
    "plainChain" TEXT,
    "uploadFileName" TEXT,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Result" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL DEFAULT 'demo-account',
    "requestId" TEXT NOT NULL,
    "variant" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "imageUrl" TEXT,
    "modelId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ResultRevision" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL DEFAULT 'demo-account',
    "requestId" TEXT NOT NULL,
    "sourceResultId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "provider" TEXT,
    "modelId" TEXT,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResultRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Lead" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL DEFAULT 'demo-account',
    "requestId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VideoGeneration" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL DEFAULT 'demo-account',
    "requestId" TEXT NOT NULL,
    "sourceResultId" TEXT,
    "sourceImageUrl" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "videoUrl" TEXT,
    "remoteVideoUrl" TEXT,
    "modelId" TEXT,
    "providerJobId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuoteRequest" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL DEFAULT 'demo-account',
    "requestId" TEXT,
    "resultId" TEXT,
    "videoId" TEXT,
    "designedImageUrl" TEXT,
    "videoUrl" TEXT,
    "generatedAt" TIMESTAMP(3),
    "productType" TEXT,
    "pendantFinish" TEXT,
    "styleId" TEXT,
    "text" TEXT,
    "twoTone" BOOLEAN,
    "primaryMetal" TEXT,
    "secondaryMetal" TEXT,
    "emblem" TEXT,
    "size" TEXT,
    "metalType" TEXT,
    "stoneType" TEXT,
    "plainColor" TEXT,
    "plainMetal" TEXT,
    "plainKarat" TEXT,
    "plainChain" TEXT,
    "diamondQuality" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "quotedPriceCents" INTEGER,
    "quoteNotes" TEXT,
    "estimatedDelivery" TEXT,
    "quoteMaterial" TEXT,
    "quoteMaterialKarat" TEXT,
    "quoteStoneType" TEXT,
    "referenceImageUrlsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AppSetting" (
    "key" TEXT NOT NULL,
    "accountId" TEXT NOT NULL DEFAULT 'demo-account',
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."StoreProfile" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "profileImageUrl" TEXT,
    "coverImageUrl" TEXT,
    "coverPreset" TEXT,
    "coverOverlayOpacity" INTEGER NOT NULL DEFAULT 27,
    "coverTextColor" TEXT NOT NULL DEFAULT 'light',
    "phone" TEXT,
    "whatsappPhone" TEXT,
    "websiteUrl" TEXT,
    "extraLinksJson" TEXT,
    "instagramHandle" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "yearStarted" TEXT,
    "statusLabel" TEXT,
    "verificationLabel" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StoreService" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'custom',
    "ctaLabel" TEXT NOT NULL,
    "href" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductCollection" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "collectionId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "category" TEXT,
    "priceLabel" TEXT,
    "priceMode" TEXT,
    "material" TEXT,
    "metalDetail" TEXT,
    "stoneQuality" TEXT,
    "weightLabel" TEXT,
    "badgeLabel" TEXT,
    "variantLabelsJson" TEXT,
    "href" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StoreReview" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "reviewerPhone" TEXT,
    "reviewerEmail" TEXT,
    "reviewerInstagram" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "reviewText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "source" TEXT NOT NULL DEFAULT 'public_profile',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VvsStudioShoot" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "pieceType" TEXT,
    "visualStyle" TEXT,
    "mood" TEXT,
    "aspectRatio" TEXT,
    "videoDurationSeconds" INTEGER DEFAULT 6,
    "metalType" TEXT,
    "goldColor" TEXT,
    "diamondWeight" TEXT,
    "engravingText" TEXT,
    "priceLabel" TEXT,
    "stoneSetting" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "error" TEXT,
    "imageFinalizedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VvsStudioShoot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VvsStudioUpload" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "shootId" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "originalContentType" TEXT,
    "normalizedContentType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "fileSize" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "originalFileNameHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VvsStudioUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VvsStudioImageGeneration" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "shootId" TEXT NOT NULL,
    "variant" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "prompt" TEXT NOT NULL,
    "promptVersion" TEXT,
    "provider" TEXT NOT NULL,
    "modelId" TEXT,
    "providerJobId" TEXT,
    "imageUrl" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VvsStudioImageGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VvsStudioVideoGeneration" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "shootId" TEXT NOT NULL,
    "sourceImageGenerationId" TEXT,
    "sourceImageUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "prompt" TEXT NOT NULL,
    "promptVersion" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'wavespeed',
    "modelId" TEXT,
    "providerJobId" TEXT,
    "videoDurationSeconds" INTEGER DEFAULT 6,
    "videoUrl" TEXT,
    "remoteVideoUrl" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VvsStudioVideoGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_slug_key" ON "public"."Account"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Account_stripeCustomerId_key" ON "public"."Account"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_stripeSubscriptionId_key" ON "public"."Account"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "AccountMembership_userId_idx" ON "public"."AccountMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountMembership_accountId_userId_key" ON "public"."AccountMembership"("accountId", "userId");

-- CreateIndex
CREATE INDEX "Request_accountId_createdAt_idx" ON "public"."Request"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "Result_accountId_createdAt_idx" ON "public"."Result"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "Result_accountId_status_idx" ON "public"."Result"("accountId", "status");

-- CreateIndex
CREATE INDEX "ResultRevision_accountId_requestId_idx" ON "public"."ResultRevision"("accountId", "requestId");

-- CreateIndex
CREATE INDEX "ResultRevision_sourceResultId_idx" ON "public"."ResultRevision"("sourceResultId");

-- CreateIndex
CREATE INDEX "Lead_accountId_createdAt_idx" ON "public"."Lead"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoGeneration_accountId_createdAt_idx" ON "public"."VideoGeneration"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoGeneration_accountId_status_idx" ON "public"."VideoGeneration"("accountId", "status");

-- CreateIndex
CREATE INDEX "QuoteRequest_accountId_createdAt_idx" ON "public"."QuoteRequest"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "QuoteRequest_accountId_status_idx" ON "public"."QuoteRequest"("accountId", "status");

-- CreateIndex
CREATE INDEX "AppSetting_accountId_idx" ON "public"."AppSetting"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreProfile_accountId_key" ON "public"."StoreProfile"("accountId");

-- CreateIndex
CREATE INDEX "StoreService_accountId_sortOrder_idx" ON "public"."StoreService"("accountId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductCollection_accountId_sortOrder_idx" ON "public"."ProductCollection"("accountId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCollection_accountId_slug_key" ON "public"."ProductCollection"("accountId", "slug");

-- CreateIndex
CREATE INDEX "Product_accountId_sortOrder_idx" ON "public"."Product"("accountId", "sortOrder");

-- CreateIndex
CREATE INDEX "Product_collectionId_sortOrder_idx" ON "public"."Product"("collectionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Product_accountId_slug_key" ON "public"."Product"("accountId", "slug");

-- CreateIndex
CREATE INDEX "StoreReview_accountId_createdAt_idx" ON "public"."StoreReview"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "StoreReview_accountId_status_idx" ON "public"."StoreReview"("accountId", "status");

-- CreateIndex
CREATE INDEX "StoreReview_accountId_rating_idx" ON "public"."StoreReview"("accountId", "rating");

-- CreateIndex
CREATE INDEX "VvsStudioShoot_accountId_createdAt_idx" ON "public"."VvsStudioShoot"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "VvsStudioShoot_accountId_status_idx" ON "public"."VvsStudioShoot"("accountId", "status");

-- CreateIndex
CREATE INDEX "VvsStudioUpload_accountId_createdAt_idx" ON "public"."VvsStudioUpload"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "VvsStudioUpload_shootId_idx" ON "public"."VvsStudioUpload"("shootId");

-- CreateIndex
CREATE UNIQUE INDEX "VvsStudioUpload_shootId_angle_key" ON "public"."VvsStudioUpload"("shootId", "angle");

-- CreateIndex
CREATE INDEX "VvsStudioImageGeneration_accountId_createdAt_idx" ON "public"."VvsStudioImageGeneration"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "VvsStudioImageGeneration_accountId_status_idx" ON "public"."VvsStudioImageGeneration"("accountId", "status");

-- CreateIndex
CREATE INDEX "VvsStudioImageGeneration_shootId_createdAt_idx" ON "public"."VvsStudioImageGeneration"("shootId", "createdAt");

-- CreateIndex
CREATE INDEX "VvsStudioVideoGeneration_accountId_createdAt_idx" ON "public"."VvsStudioVideoGeneration"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "VvsStudioVideoGeneration_accountId_status_idx" ON "public"."VvsStudioVideoGeneration"("accountId", "status");

-- CreateIndex
CREATE INDEX "VvsStudioVideoGeneration_shootId_createdAt_idx" ON "public"."VvsStudioVideoGeneration"("shootId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."AccountMembership" ADD CONSTRAINT "AccountMembership_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AccountMembership" ADD CONSTRAINT "AccountMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Request" ADD CONSTRAINT "Request_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Request" ADD CONSTRAINT "Request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Result" ADD CONSTRAINT "Result_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Result" ADD CONSTRAINT "Result_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResultRevision" ADD CONSTRAINT "ResultRevision_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResultRevision" ADD CONSTRAINT "ResultRevision_sourceResultId_fkey" FOREIGN KEY ("sourceResultId") REFERENCES "public"."Result"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lead" ADD CONSTRAINT "Lead_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VideoGeneration" ADD CONSTRAINT "VideoGeneration_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VideoGeneration" ADD CONSTRAINT "VideoGeneration_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuoteRequest" ADD CONSTRAINT "QuoteRequest_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuoteRequest" ADD CONSTRAINT "QuoteRequest_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."Request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuoteRequest" ADD CONSTRAINT "QuoteRequest_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "public"."Result"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuoteRequest" ADD CONSTRAINT "QuoteRequest_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "public"."VideoGeneration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AppSetting" ADD CONSTRAINT "AppSetting_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StoreProfile" ADD CONSTRAINT "StoreProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StoreService" ADD CONSTRAINT "StoreService_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductCollection" ADD CONSTRAINT "ProductCollection_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "public"."ProductCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StoreReview" ADD CONSTRAINT "StoreReview_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VvsStudioShoot" ADD CONSTRAINT "VvsStudioShoot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VvsStudioUpload" ADD CONSTRAINT "VvsStudioUpload_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VvsStudioUpload" ADD CONSTRAINT "VvsStudioUpload_shootId_fkey" FOREIGN KEY ("shootId") REFERENCES "public"."VvsStudioShoot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VvsStudioImageGeneration" ADD CONSTRAINT "VvsStudioImageGeneration_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VvsStudioImageGeneration" ADD CONSTRAINT "VvsStudioImageGeneration_shootId_fkey" FOREIGN KEY ("shootId") REFERENCES "public"."VvsStudioShoot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VvsStudioVideoGeneration" ADD CONSTRAINT "VvsStudioVideoGeneration_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VvsStudioVideoGeneration" ADD CONSTRAINT "VvsStudioVideoGeneration_shootId_fkey" FOREIGN KEY ("shootId") REFERENCES "public"."VvsStudioShoot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

