/*
  Warnings:

  - You are about to drop the column `lastActivity` on the `message_channels` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "message_channels" DROP COLUMN "lastActivity";

-- CreateTable
CREATE TABLE "message_channel_inbox" (
    "channelId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "lastReadMessageId" BIGINT
);

-- CreateIndex
CREATE INDEX "message_channel_inbox_channelId_idx" ON "message_channel_inbox"("channelId");

-- CreateIndex
CREATE INDEX "message_channel_inbox_userId_idx" ON "message_channel_inbox"("userId");

-- CreateIndex
CREATE INDEX "message_channel_inbox_lastReadMessageId_idx" ON "message_channel_inbox"("lastReadMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "message_channel_inbox_channelId_userId_key" ON "message_channel_inbox"("channelId", "userId");

-- AddForeignKey
ALTER TABLE "message_channel_inbox" ADD CONSTRAINT "message_channel_inbox_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "message_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_channel_inbox" ADD CONSTRAINT "message_channel_inbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
