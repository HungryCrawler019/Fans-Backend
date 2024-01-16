-- CreateTable
CREATE TABLE "payout_logs" (
    "id" BIGINT NOT NULL,
    "profileId" BIGINT NOT NULL,
    "payoutPaymentMethodId" BIGINT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "platformFee" DOUBLE PRECISION NOT NULL,
    "processingFee" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payout_logs_profileId_idx" ON "payout_logs"("profileId");

-- CreateIndex
CREATE INDEX "payout_logs_payoutPaymentMethodId_idx" ON "payout_logs"("payoutPaymentMethodId");

-- CreateIndex
CREATE INDEX "payout_logs_amount_idx" ON "payout_logs"("amount");

-- CreateIndex
CREATE INDEX "payout_logs_platformFee_idx" ON "payout_logs"("platformFee");

-- CreateIndex
CREATE INDEX "payout_logs_processingFee_idx" ON "payout_logs"("processingFee");

-- CreateIndex
CREATE INDEX "payout_logs_currency_idx" ON "payout_logs" USING HASH ("currency");

-- CreateIndex
CREATE INDEX "payout_logs_status_idx" ON "payout_logs" USING HASH ("status");

-- CreateIndex
CREATE INDEX "payout_logs_updatedAt_idx" ON "payout_logs"("updatedAt");

-- CreateIndex
CREATE INDEX "payout_logs_createdAt_idx" ON "payout_logs"("createdAt");
