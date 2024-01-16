-- AlterTable
ALTER TABLE "user_levels" ADD COLUMN     "roleId" BIGINT;

-- AddForeignKey
ALTER TABLE "user_levels" ADD CONSTRAINT "user_levels_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
