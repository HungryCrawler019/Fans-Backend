/*
  Warnings:

  - You are about to drop the column `isDeleted` on the `message_channel_inbox` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "message_channel_inbox" DROP COLUMN "isDeleted";

-- CreateIndex
CREATE INDEX "message_channel_inbox_isPinned_idx" ON "message_channel_inbox" USING HASH ("isPinned");
