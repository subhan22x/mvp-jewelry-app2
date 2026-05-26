CREATE TABLE "ResultRevision" (
    "id"             TEXT NOT NULL PRIMARY KEY,
    "accountId"      TEXT NOT NULL DEFAULT 'demo-account',
    "requestId"      TEXT NOT NULL,
    "sourceResultId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "prompt"         TEXT NOT NULL,
    "imageUrl"       TEXT,
    "status"         TEXT NOT NULL DEFAULT 'pending',
    "error"          TEXT,
    "provider"       TEXT,
    "modelId"        TEXT,
    "completedAt"    DATETIME,
    "durationMs"     INTEGER,
    "createdAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResultRevision_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ResultRevision_sourceResultId_fkey" FOREIGN KEY ("sourceResultId") REFERENCES "Result" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "ResultRevision_accountId_requestId_idx" ON "ResultRevision"("accountId", "requestId");
CREATE INDEX "ResultRevision_sourceResultId_idx" ON "ResultRevision"("sourceResultId");
