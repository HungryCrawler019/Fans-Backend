-- CreateTable
CREATE TABLE "payment_subscription_transactions" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "creatorId" BIGINT NOT NULL,
    "paymentSubscriptionId" BIGINT NOT NULL,
    "transactionId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "SubscriptionStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_subscription_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_subscription_transactions_transactionId_key" ON "payment_subscription_transactions"("transactionId");

-- CreateIndex
CREATE INDEX "payment_subscription_transactions_userId_idx" ON "payment_subscription_transactions"("userId");

-- CreateIndex
CREATE INDEX "payment_subscription_transactions_creatorId_idx" ON "payment_subscription_transactions"("creatorId");

-- CreateIndex
CREATE INDEX "payment_subscription_transactions_paymentSubscriptionId_idx" ON "payment_subscription_transactions"("paymentSubscriptionId");

-- CreateIndex
CREATE INDEX "payment_subscription_transactions_transactionId_idx" ON "payment_subscription_transactions" USING HASH ("transactionId");

-- CreateIndex
CREATE INDEX "payment_subscription_transactions_amount_idx" ON "payment_subscription_transactions"("amount");

-- CreateIndex
CREATE INDEX "payment_subscription_transactions_currency_idx" ON "payment_subscription_transactions" USING HASH ("currency");

-- CreateIndex
CREATE INDEX "payment_subscription_transactions_status_idx" ON "payment_subscription_transactions" USING HASH ("status");

-- AddForeignKey
ALTER TABLE "payment_subscription_transactions" ADD CONSTRAINT "payment_subscription_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_subscription_transactions" ADD CONSTRAINT "payment_subscription_transactions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_subscription_transactions" ADD CONSTRAINT "payment_subscription_transactions_paymentSubscriptionId_fkey" FOREIGN KEY ("paymentSubscriptionId") REFERENCES "payment_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
