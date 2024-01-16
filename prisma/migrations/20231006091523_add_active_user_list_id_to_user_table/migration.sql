/*
  Warnings:

  - A unique constraint covering the columns `[activeUserListId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activeUserListId" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "users_activeUserListId_key" ON "users"("activeUserListId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_activeUserListId_fkey" FOREIGN KEY ("activeUserListId") REFERENCES "user_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;
