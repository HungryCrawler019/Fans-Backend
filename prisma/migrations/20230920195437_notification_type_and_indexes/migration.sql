/*
  Warnings:

  - Added the required column `type` to the `notifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "type" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "notification_user_notificationId_idx" ON "notification_user"("notificationId");

-- CreateIndex
CREATE INDEX "notification_user_userId_idx" ON "notification_user"("userId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications" USING HASH ("type");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "notifications" USING HASH ("read");

-- CreateIndex
CREATE INDEX "notifications_commentId_idx" ON "notifications"("commentId");

-- CreateIndex
CREATE INDEX "notifications_postId_idx" ON "notifications"("postId");

-- CreateIndex
CREATE INDEX "notifications_creatorId_idx" ON "notifications"("creatorId");

-- CreateIndex
CREATE INDEX "notifications_roleId_idx" ON "notifications"("roleId");
