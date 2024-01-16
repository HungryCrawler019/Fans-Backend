/*
  Warnings:

  - You are about to drop the column `meetingBuffer` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `meetingType` on the `profiles` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "MeetingContentType" AS ENUM ('Consultation', 'Advice', 'Performance', 'EighteenPlusAdult', 'EighteenPlusSexual', 'Spirituality');

-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "meetingBuffer",
DROP COLUMN "meetingType";

-- CreateTable
CREATE TABLE "meeting_settings" (
    "profileId" BIGINT NOT NULL,
    "bufferBetweenCalls" INTEGER NOT NULL DEFAULT 5,
    "meetingType" "MeetingType" NOT NULL DEFAULT 'OneOnOne_TwoWay',
    "sexualContentAllowed" BOOLEAN NOT NULL DEFAULT false,
    "contentPreferences" "MeetingContentType"[] DEFAULT ARRAY[]::"MeetingContentType"[],
    "customContentPreferences" TEXT,
    "title" TEXT,
    "description" TEXT,
    "notificationNewRequests" BOOLEAN NOT NULL DEFAULT true,
    "notificationCancellations" BOOLEAN NOT NULL DEFAULT true,
    "notificationReminders" BOOLEAN NOT NULL DEFAULT true,
    "notificationsByEmail" BOOLEAN NOT NULL DEFAULT true,
    "notificationsByPhone" BOOLEAN NOT NULL DEFAULT true,
    "videoCallsEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "meeting_settings_pkey" PRIMARY KEY ("profileId")
);

-- AddForeignKey
ALTER TABLE "meeting_settings" ADD CONSTRAINT "meeting_settings_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION auto_insert_meeting_settings() RETURNS TRIGGER AS
$BODY$
BEGIN
    INSERT INTO
        "meeting_settings" ("profileId")
        VALUES(new.id);
        RETURN new;
END;
$BODY$
language plpgsql;

CREATE TRIGGER meeting_settings_auto_inserter
AFTER INSERT ON "profiles"
FOR EACH ROW
EXECUTE PROCEDURE auto_insert_meeting_settings();

INSERT INTO "meeting_settings" ("profileId") SELECT id from "profiles";
