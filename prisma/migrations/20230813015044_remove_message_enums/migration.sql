/*
  Warnings:

  - Changed the type of `channelType` on the `message_channels` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `messageType` on the `messages` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "message_channels" DROP COLUMN "channelType",
ADD COLUMN     "channelType" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "messageType",
ADD COLUMN     "messageType" INTEGER NOT NULL;

-- DropEnum
DROP TYPE "MessageChannelType";

-- DropEnum
DROP TYPE "MessageType";

-- CreateIndex
CREATE INDEX "message_channels_channelType_idx" ON "message_channels" USING HASH ("channelType");

-- CreateIndex
CREATE INDEX "messages_messageType_idx" ON "messages" USING HASH ("messageType");
