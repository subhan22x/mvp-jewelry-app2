-- Track image-generation attempts explicitly so polling can tell pending work
-- apart from completed failures and report how long each attempt took.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Result" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "variant" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "imageUrl" TEXT,
    "modelId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "durationMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Result_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Result" (
    "createdAt",
    "completedAt",
    "durationMs",
    "id",
    "imageUrl",
    "modelId",
    "prompt",
    "requestId",
    "startedAt",
    "status",
    "variant"
)
SELECT
    "createdAt",
    "createdAt",
    0,
    "id",
    "imageUrl",
    "modelId",
    "prompt",
    "requestId",
    "createdAt",
    'succeeded',
    "variant"
FROM "Result";

DROP TABLE "Result";
ALTER TABLE "new_Result" RENAME TO "Result";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
