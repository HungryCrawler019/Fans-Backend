/*
  Warnings:

  - Changed the type of `status` on the `payment_subscription_transactions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "payment_subscription_transactions" DROP COLUMN "status",
ADD COLUMN     "status" "TransactionStatus" NOT NULL;

-- CreateIndex
CREATE INDEX "payment_subscription_transactions_status_idx" ON "payment_subscription_transactions" USING HASH ("status");
