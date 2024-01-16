/*
  Warnings:

  - You are about to drop the column `startDate` on the `fundraisers` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `giveways` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `polls` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "fundraisers_startDate_idx";

-- DropIndex
DROP INDEX "giveways_startDate_idx";

-- DropIndex
DROP INDEX "polls_startDate_idx";

-- AlterTable
ALTER TABLE "fundraisers" DROP COLUMN "startDate";

-- AlterTable
ALTER TABLE "giveways" DROP COLUMN "startDate";

-- AlterTable
ALTER TABLE "polls" DROP COLUMN "startDate";
