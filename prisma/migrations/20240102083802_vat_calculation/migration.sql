-- AlterTable
ALTER TABLE "cameo_payments" ADD COLUMN     "vatFee" INTEGER;

-- AlterTable
ALTER TABLE "chat_paid_post_transactions" ADD COLUMN     "vatFee" INTEGER;

-- AlterTable
ALTER TABLE "paid_post_transactions" ADD COLUMN     "vatFee" INTEGER;

-- CreateIndex
CREATE INDEX "gem_transactions_vatFee_idx" ON "gem_transactions" USING HASH ("vatFee");

-- CreateIndex
CREATE INDEX "payment_subscriptions_vatFee_idx" ON "payment_subscriptions" USING HASH ("vatFee");
