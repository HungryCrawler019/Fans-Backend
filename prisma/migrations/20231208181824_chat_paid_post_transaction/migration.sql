-- CreateTable
CREATE TABLE "chat_paid_post_transactions" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "creatorId" BIGINT NOT NULL,
    "paymentMethodId" BIGINT,
    "paymentProfileId" TEXT,
    "messageId" BIGINT NOT NULL,
    "transactionId" TEXT,
    "provider" "PaymentProvider",
    "amount" INTEGER NOT NULL,
    "processingFee" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "TransactionStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_paid_post_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_paid_post_transactions_transactionId_key" ON "chat_paid_post_transactions"("transactionId");

-- CreateIndex
CREATE INDEX "chat_paid_post_transactions_userId_idx" ON "chat_paid_post_transactions"("userId");

-- CreateIndex
CREATE INDEX "chat_paid_post_transactions_creatorId_idx" ON "chat_paid_post_transactions"("creatorId");

-- CreateIndex
CREATE INDEX "chat_paid_post_transactions_transactionId_idx" ON "chat_paid_post_transactions" USING HASH ("transactionId");

-- CreateIndex
CREATE INDEX "chat_paid_post_transactions_amount_idx" ON "chat_paid_post_transactions"("amount");

-- CreateIndex
CREATE INDEX "chat_paid_post_transactions_currency_idx" ON "chat_paid_post_transactions" USING HASH ("currency");

-- CreateIndex
CREATE INDEX "chat_paid_post_transactions_status_idx" ON "chat_paid_post_transactions" USING HASH ("status");

-- CreateIndex
CREATE INDEX "chat_paid_post_transactions_createdAt_idx" ON "chat_paid_post_transactions"("createdAt");

-- AddForeignKey
ALTER TABLE "chat_paid_post_transactions" ADD CONSTRAINT "chat_paid_post_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_paid_post_transactions" ADD CONSTRAINT "chat_paid_post_transactions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_paid_post_transactions" ADD CONSTRAINT "chat_paid_post_transactions_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_paid_post_transactions" ADD CONSTRAINT "chat_paid_post_transactions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
