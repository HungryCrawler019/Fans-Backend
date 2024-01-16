/*
  Warnings:

  - You are about to drop the column `type` on the `meetings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "meetings" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "meetingType" "MeetingType" NOT NULL DEFAULT 'OneOnOne_TwoWay';
