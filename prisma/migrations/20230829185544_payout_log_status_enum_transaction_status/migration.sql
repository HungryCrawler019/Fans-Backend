/*
  Warnings:

  - Changed the type of `status` on the `payout_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "payout_logs" DROP COLUMN "status",
ADD COLUMN     "status" "TransactionStatus" NOT NULL;

-- CreateIndex
CREATE INDEX "payout_logs_status_idx" ON "payout_logs" USING HASH ("status");
