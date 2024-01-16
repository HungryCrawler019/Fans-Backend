/*
  Warnings:

  - You are about to drop the column `endDate` on the `campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `campaigns` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "campaigns_endDate_idx";

-- DropIndex
DROP INDEX "campaigns_startDate_idx";

-- AlterTable
ALTER TABLE "campaigns" DROP COLUMN "endDate",
DROP COLUMN "startDate";
