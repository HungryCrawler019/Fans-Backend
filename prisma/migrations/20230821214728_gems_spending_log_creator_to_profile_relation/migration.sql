-- DropForeignKey
ALTER TABLE "gems_spending_logs" DROP CONSTRAINT "gems_spending_logs_creatorId_fkey";

-- AddForeignKey
ALTER TABLE "gems_spending_logs" ADD CONSTRAINT "gems_spending_logs_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
