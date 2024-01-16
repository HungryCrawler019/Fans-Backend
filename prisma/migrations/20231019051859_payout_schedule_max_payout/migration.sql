/*
  Warnings:

  - You are about to alter the column `threshold` on the `payout_schedules` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "payout_schedules" ADD COLUMN     "maxPayout" INTEGER DEFAULT 0,
ALTER COLUMN "threshold" SET DATA TYPE INTEGER;
