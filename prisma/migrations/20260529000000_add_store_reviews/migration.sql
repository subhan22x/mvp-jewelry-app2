CREATE TABLE "StoreReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "reviewerPhone" TEXT,
    "reviewerEmail" TEXT,
    "reviewerInstagram" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "reviewText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "source" TEXT NOT NULL DEFAULT 'public_profile',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StoreReview_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "StoreReview_accountId_createdAt_idx" ON "StoreReview"("accountId", "createdAt");
CREATE INDEX "StoreReview_accountId_status_idx" ON "StoreReview"("accountId", "status");
CREATE INDEX "StoreReview_accountId_rating_idx" ON "StoreReview"("accountId", "rating");
