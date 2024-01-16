/*
  Warnings:

  - Changed the type of `messageType` on the `messages` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT');

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "messageType",
ADD COLUMN     "messageType" "MessageType" NOT NULL;

-- CreateIndex
CREATE INDEX "messages_messageType_idx" ON "messages" USING HASH ("messageType");
