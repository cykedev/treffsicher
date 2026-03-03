-- CreateTable
CREATE TABLE "LoginRateLimitBucket" (
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginRateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "LoginRateLimitBucket_lastAttemptAt_idx" ON "LoginRateLimitBucket"("lastAttemptAt");

-- CreateIndex
CREATE INDEX "LoginRateLimitBucket_blockedUntil_idx" ON "LoginRateLimitBucket"("blockedUntil");
