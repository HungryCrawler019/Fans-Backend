-- AlterTable
ALTER TABLE "custom_video_settings" ADD COLUMN     "customVideoEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notificationCompletedRequests" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notificationNewRequests" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notificationPendingVideos" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notificationsByEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notificationsByPhone" BOOLEAN NOT NULL DEFAULT true;
