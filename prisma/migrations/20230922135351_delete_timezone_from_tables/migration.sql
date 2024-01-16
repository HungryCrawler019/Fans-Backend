/*
  Warnings:

  - You are about to drop the column `timezone` on the `fundraisers` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `giveways` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `polls` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `schedules` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "fundraisers_timezone_idx";

-- DropIndex
DROP INDEX "giveways_timezone_idx";

-- DropIndex
DROP INDEX "polls_timezone_idx";

-- DropIndex
DROP INDEX "schedules_timezone_idx";

-- AlterTable
ALTER TABLE "schedules" DROP COLUMN "timezone";

-- AlterTable
ALTER TABLE "fundraisers" DROP COLUMN "timezone";

-- AlterTable
ALTER TABLE "giveways" DROP COLUMN "timezone";

-- AlterTable
ALTER TABLE "polls" DROP COLUMN "timezone";
