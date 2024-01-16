/*
  Warnings:

  - Made the column `amount` on table `balances` required. This step will fail if there are existing NULL values in that column.
  - Made the column `amount` on table `gem_transactions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `processingFee` on table `gem_transactions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `platformFee` on table `gem_transactions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `amount` on table `gems_balances` required. This step will fail if there are existing NULL values in that column.
  - Made the column `amount` on table `gems_spending_logs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `platformFee` on table `gems_spending_logs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `amount` on table `payment_subscription_transactions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `amount` on table `payment_subscriptions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `processingFee` on table `payment_subscriptions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `platformFee` on table `payment_subscriptions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `amount` on table `payout_logs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `platformFee` on table `payout_logs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `processingFee` on table `payout_logs` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "balances" ALTER COLUMN "amount" SET NOT NULL;

-- AlterTable
ALTER TABLE "gem_transactions" ALTER COLUMN "amount" SET NOT NULL,
ALTER COLUMN "processingFee" SET NOT NULL,
ALTER COLUMN "platformFee" SET NOT NULL;

-- AlterTable
ALTER TABLE "gems_balances" ALTER COLUMN "amount" SET NOT NULL;

-- AlterTable
ALTER TABLE "gems_spending_logs" ALTER COLUMN "amount" SET NOT NULL,
ALTER COLUMN "platformFee" SET NOT NULL;

-- AlterTable
ALTER TABLE "payment_subscription_transactions" ALTER COLUMN "amount" SET NOT NULL;

-- AlterTable
ALTER TABLE "payment_subscriptions" ALTER COLUMN "amount" SET NOT NULL,
ALTER COLUMN "processingFee" SET NOT NULL,
ALTER COLUMN "platformFee" SET NOT NULL;

-- AlterTable
ALTER TABLE "payout_logs" ALTER COLUMN "amount" SET NOT NULL,
ALTER COLUMN "platformFee" SET NOT NULL,
ALTER COLUMN "processingFee" SET NOT NULL;

-- CreateIndex
CREATE INDEX "balances_amount_idx" ON "balances"("amount");

-- CreateIndex
CREATE INDEX "gem_transactions_amount_idx" ON "gem_transactions"("amount");

-- CreateIndex
CREATE INDEX "gem_transactions_processingFee_idx" ON "gem_transactions"("processingFee");

-- CreateIndex
CREATE INDEX "gem_transactions_platformFee_idx" ON "gem_transactions"("platformFee");

-- CreateIndex
CREATE INDEX "gems_balances_amount_idx" ON "gems_balances"("amount");

-- CreateIndex
CREATE INDEX "gems_spending_logs_amount_idx" ON "gems_spending_logs"("amount");

-- CreateIndex
CREATE INDEX "gems_spending_logs_platformFee_idx" ON "gems_spending_logs"("platformFee");

-- CreateIndex
CREATE INDEX "payment_subscription_transactions_amount_idx" ON "payment_subscription_transactions"("amount");

-- CreateIndex
CREATE INDEX "payment_subscriptions_amount_idx" ON "payment_subscriptions"("amount");

-- CreateIndex
CREATE INDEX "payment_subscriptions_processingFee_idx" ON "payment_subscriptions"("processingFee");

-- CreateIndex
CREATE INDEX "payment_subscriptions_platformFee_idx" ON "payment_subscriptions"("platformFee");

-- CreateIndex
CREATE INDEX "payout_logs_amount_idx" ON "payout_logs"("amount");

-- CreateIndex
CREATE INDEX "payout_logs_platformFee_idx" ON "payout_logs"("platformFee");

-- CreateIndex
CREATE INDEX "payout_logs_processingFee_idx" ON "payout_logs"("processingFee");
