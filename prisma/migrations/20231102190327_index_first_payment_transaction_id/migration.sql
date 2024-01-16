-- CreateIndex
CREATE INDEX "payment_subscriptions_firstPaymentTransactionId_idx" ON "payment_subscriptions" USING HASH ("firstPaymentTransactionId");
