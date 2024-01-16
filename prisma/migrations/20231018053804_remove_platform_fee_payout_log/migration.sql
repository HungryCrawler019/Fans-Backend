/*
  Warnings:

  - You are about to drop the column `platformFee` on the `payout_logs` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "payout_logs_platformFee_idx";

-- AlterTable
ALTER TABLE "payout_logs" DROP COLUMN "platformFee";
