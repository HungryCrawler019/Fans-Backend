/*
  Warnings:

  - You are about to drop the column `birthDate` on the `bank_info` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "bank_info_birthDate_idx";

-- AlterTable
ALTER TABLE "bank_info" DROP COLUMN "birthDate";
