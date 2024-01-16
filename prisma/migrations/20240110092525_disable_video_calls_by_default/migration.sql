-- AlterTable
ALTER TABLE "meeting_settings" ALTER COLUMN "videoCallsEnabled" SET DEFAULT false;

UPDATE "meeting_settings" SET "videoCallsEnabled" = false;
