/*
  Warnings:

  - Added the required column `platformFee` to the `paid_post_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `processingFee` to the `paid_post_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "paid_post_transactions" ADD COLUMN     "platformFee" INTEGER NOT NULL,
ADD COLUMN     "processingFee" INTEGER NOT NULL;
