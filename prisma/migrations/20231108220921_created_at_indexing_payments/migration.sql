-- AlterTable
ALTER TABLE "gems_spending_logs" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "gems_spending_logs_createdAt_idx" ON "gems_spending_logs"("createdAt");

-- CreateIndex
CREATE INDEX "paid_post_transactions_createdAt_idx" ON "paid_post_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "payment_subscription_transactions_createdAt_idx" ON "payment_subscription_transactions"("createdAt");
