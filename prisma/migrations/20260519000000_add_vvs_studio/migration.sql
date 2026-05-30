-- VVS Studio tables

CREATE TABLE "VvsStudioShoot" (
    "id"              TEXT NOT NULL PRIMARY KEY,
    "accountId"       TEXT NOT NULL,
    "createdByUserId" TEXT,
    "pieceType"       TEXT,
    "visualStyle"     TEXT,
    "mood"            TEXT,
    "aspectRatio"     TEXT,
    "metalType"       TEXT,
    "goldColor"       TEXT,
    "diamondWeight"   TEXT,
    "engravingText"   TEXT,
    "priceLabel"      TEXT,
    "stoneSetting"    TEXT,
    "status"          TEXT NOT NULL DEFAULT 'draft',
    "error"           TEXT,
    "imageFinalizedAt" DATETIME,
    "completedAt"     DATETIME,
    "createdAt"       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       DATETIME NOT NULL,
    CONSTRAINT "VvsStudioShoot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "VvsStudioUpload" (
    "id"                    TEXT NOT NULL PRIMARY KEY,
    "accountId"             TEXT NOT NULL,
    "shootId"               TEXT NOT NULL,
    "angle"                 TEXT NOT NULL,
    "storageKey"            TEXT NOT NULL,
    "imageUrl"              TEXT NOT NULL,
    "originalContentType"   TEXT,
    "normalizedContentType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "fileSize"              INTEGER,
    "width"                 INTEGER,
    "height"                INTEGER,
    "originalFileNameHash"  TEXT,
    "createdAt"             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VvsStudioUpload_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VvsStudioUpload_shootId_fkey" FOREIGN KEY ("shootId") REFERENCES "VvsStudioShoot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "VvsStudioImageGeneration" (
    "id"            TEXT NOT NULL PRIMARY KEY,
    "accountId"     TEXT NOT NULL,
    "shootId"       TEXT NOT NULL,
    "variant"       INTEGER NOT NULL DEFAULT 1,
    "status"        TEXT NOT NULL DEFAULT 'pending',
    "prompt"        TEXT NOT NULL,
    "promptVersion" TEXT,
    "provider"      TEXT NOT NULL,
    "modelId"       TEXT,
    "providerJobId" TEXT,
    "imageUrl"      TEXT,
    "error"         TEXT,
    "startedAt"     DATETIME,
    "completedAt"   DATETIME,
    "durationMs"    INTEGER,
    "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VvsStudioImageGeneration_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VvsStudioImageGeneration_shootId_fkey" FOREIGN KEY ("shootId") REFERENCES "VvsStudioShoot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "VvsStudioVideoGeneration" (
    "id"                      TEXT NOT NULL PRIMARY KEY,
    "accountId"               TEXT NOT NULL,
    "shootId"                 TEXT NOT NULL,
    "sourceImageGenerationId" TEXT,
    "sourceImageUrl"          TEXT NOT NULL,
    "status"                  TEXT NOT NULL DEFAULT 'pending',
    "prompt"                  TEXT NOT NULL,
    "promptVersion"           TEXT,
    "provider"                TEXT NOT NULL DEFAULT 'wavespeed',
    "modelId"                 TEXT,
    "providerJobId"           TEXT,
    "videoUrl"                TEXT,
    "remoteVideoUrl"          TEXT,
    "error"                   TEXT,
    "startedAt"               DATETIME,
    "completedAt"             DATETIME,
    "durationMs"              INTEGER,
    "createdAt"               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VvsStudioVideoGeneration_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VvsStudioVideoGeneration_shootId_fkey" FOREIGN KEY ("shootId") REFERENCES "VvsStudioShoot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Indexes
CREATE INDEX "VvsStudioShoot_accountId_createdAt_idx" ON "VvsStudioShoot"("accountId", "createdAt");
CREATE INDEX "VvsStudioShoot_accountId_status_idx" ON "VvsStudioShoot"("accountId", "status");

CREATE UNIQUE INDEX "VvsStudioUpload_shootId_angle_key" ON "VvsStudioUpload"("shootId", "angle");
CREATE INDEX "VvsStudioUpload_accountId_createdAt_idx" ON "VvsStudioUpload"("accountId", "createdAt");
CREATE INDEX "VvsStudioUpload_shootId_idx" ON "VvsStudioUpload"("shootId");

CREATE INDEX "VvsStudioImageGeneration_accountId_createdAt_idx" ON "VvsStudioImageGeneration"("accountId", "createdAt");
CREATE INDEX "VvsStudioImageGeneration_accountId_status_idx" ON "VvsStudioImageGeneration"("accountId", "status");
CREATE INDEX "VvsStudioImageGeneration_shootId_createdAt_idx" ON "VvsStudioImageGeneration"("shootId", "createdAt");

CREATE INDEX "VvsStudioVideoGeneration_accountId_createdAt_idx" ON "VvsStudioVideoGeneration"("accountId", "createdAt");
CREATE INDEX "VvsStudioVideoGeneration_accountId_status_idx" ON "VvsStudioVideoGeneration"("accountId", "status");
CREATE INDEX "VvsStudioVideoGeneration_shootId_createdAt_idx" ON "VvsStudioVideoGeneration"("shootId", "createdAt");
