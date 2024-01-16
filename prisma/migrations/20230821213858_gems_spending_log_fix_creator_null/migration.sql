/*
  Warnings:

  - Made the column `creatorId` on table `gems_spending_logs` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "gems_spending_logs" DROP CONSTRAINT "gems_spending_logs_creatorId_fkey";

-- AlterTable
ALTER TABLE "gems_spending_logs" ALTER COLUMN "creatorId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "gems_spending_logs" ADD CONSTRAINT "gems_spending_logs_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
