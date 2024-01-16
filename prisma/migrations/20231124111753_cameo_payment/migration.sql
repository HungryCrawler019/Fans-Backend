-- CreateTable
CREATE TABLE "cameo_payments" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "creatorId" BIGINT NOT NULL,
    "paymentMethodId" BIGINT,
    "paymentProfileId" TEXT,
    "transactionId" TEXT,
    "provider" "PaymentProvider",
    "amount" INTEGER NOT NULL,
    "processingFee" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "TransactionStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cameo_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cameo_payments_transactionId_key" ON "cameo_payments"("transactionId");

-- CreateIndex
CREATE INDEX "cameo_payments_userId_idx" ON "cameo_payments"("userId");

-- CreateIndex
CREATE INDEX "cameo_payments_creatorId_idx" ON "cameo_payments"("creatorId");

-- CreateIndex
CREATE INDEX "cameo_payments_transactionId_idx" ON "cameo_payments" USING HASH ("transactionId");

-- CreateIndex
CREATE INDEX "cameo_payments_amount_idx" ON "cameo_payments"("amount");

-- CreateIndex
CREATE INDEX "cameo_payments_currency_idx" ON "cameo_payments" USING HASH ("currency");

-- CreateIndex
CREATE INDEX "cameo_payments_status_idx" ON "cameo_payments" USING HASH ("status");

-- CreateIndex
CREATE INDEX "cameo_payments_createdAt_idx" ON "cameo_payments"("createdAt");

-- AddForeignKey
ALTER TABLE "cameo_payments" ADD CONSTRAINT "cameo_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cameo_payments" ADD CONSTRAINT "cameo_payments_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cameo_payments" ADD CONSTRAINT "cameo_payments_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
