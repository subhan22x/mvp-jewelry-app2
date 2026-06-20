-- CreateTable
CREATE TABLE "Model3dGeneration" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL DEFAULT 'demo-account',
    "requestId" TEXT NOT NULL,
    "sourceResultId" TEXT,
    "sourceImageUrl" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'glb',
    "modelUrl" TEXT,
    "remoteModelUrl" TEXT,
    "modelId" TEXT,
    "providerJobId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Model3dGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Model3dGeneration_accountId_createdAt_idx" ON "Model3dGeneration"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "Model3dGeneration_accountId_status_idx" ON "Model3dGeneration"("accountId", "status");

-- AddForeignKey
ALTER TABLE "Model3dGeneration" ADD CONSTRAINT "Model3dGeneration_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model3dGeneration" ADD CONSTRAINT "Model3dGeneration_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
