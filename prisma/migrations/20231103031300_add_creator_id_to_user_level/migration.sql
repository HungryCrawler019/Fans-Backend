/*
  Warnings:

  - Added the required column `creatorId` to the `user_levels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creatorId` to the `xp_logs` table without a default value. This is not possible if the table is not empty.

*/

DELETE FROM "user_levels";
DELETE FROM "xp_logs";

-- DropIndex
DROP INDEX "user_levels_userId_key";

-- AlterTable
ALTER TABLE "user_levels" ADD COLUMN     "creatorId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "xp_logs" ADD COLUMN     "creatorId" BIGINT NOT NULL;

-- CreateIndex
CREATE INDEX "user_levels_creatorId_idx" ON "user_levels"("creatorId");

-- CreateIndex
CREATE INDEX "xp_logs_creatorId_idx" ON "xp_logs"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "user_levels_userId_creatorId_key" ON "user_levels"("userId", "creatorId");

-- AddForeignKey
ALTER TABLE "user_levels" ADD CONSTRAINT "user_levels_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_logs" ADD CONSTRAINT "xp_logs_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

