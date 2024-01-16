-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "commentId" BIGINT,
ADD COLUMN     "creatorId" BIGINT,
ADD COLUMN     "postId" BIGINT,
ADD COLUMN     "roleId" BIGINT;

-- CreateTable
CREATE TABLE "notification_user" (
    "notificationId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_user_notificationId_userId_key" ON "notification_user"("notificationId", "userId");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_user" ADD CONSTRAINT "notification_user_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_user" ADD CONSTRAINT "notification_user_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
