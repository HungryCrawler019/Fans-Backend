-- CreateTable
CREATE TABLE "payout_payment_methods" (
    "id" BIGINT NOT NULL,
    "profileId" BIGINT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "paypalEmail" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_targets" (
    "id" BIGINT NOT NULL,
    "appId" BIGINT NOT NULL,
    "target" TEXT NOT NULL,
    "secret" TEXT NOT NULL,

    CONSTRAINT "webhook_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_retries" (
    "id" BIGINT NOT NULL,
    "targetId" BIGINT NOT NULL,
    "payload" TEXT NOT NULL,
    "retryAfter" TIMESTAMP(3) NOT NULL,
    "retryCount" INTEGER NOT NULL,

    CONSTRAINT "webhook_retries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payout_payment_methods_profileId_idx" ON "payout_payment_methods"("profileId");

-- CreateIndex
CREATE INDEX "payout_payment_methods_provider_idx" ON "payout_payment_methods" USING HASH ("provider");

-- CreateIndex
CREATE INDEX "payout_payment_methods_paypalEmail_idx" ON "payout_payment_methods"("paypalEmail");

-- CreateIndex
CREATE INDEX "payout_payment_methods_updatedAt_idx" ON "payout_payment_methods"("updatedAt");

-- CreateIndex
CREATE INDEX "applications_userId_idx" ON "applications"("userId");

-- CreateIndex
CREATE INDEX "webhook_targets_appId_idx" ON "webhook_targets"("appId");

-- CreateIndex
CREATE INDEX "webhook_retries_targetId_idx" ON "webhook_retries"("targetId");

-- CreateIndex
CREATE INDEX "webhook_retries_retryAfter_idx" ON "webhook_retries"("retryAfter");

-- AddForeignKey
ALTER TABLE "payout_payment_methods" ADD CONSTRAINT "payout_payment_methods_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_targets" ADD CONSTRAINT "webhook_targets_appId_fkey" FOREIGN KEY ("appId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_retries" ADD CONSTRAINT "webhook_retries_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "webhook_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
