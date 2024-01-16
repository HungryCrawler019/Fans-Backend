-- AlterTable
ALTER TABLE "notifications_settings" ADD COLUMN     "cancelSubscriptionCreatorInApp" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "chargebackCreatorEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "chargebackCreatorInApp" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "chargebackFanEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "chargebackFanInApp" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "commentCreatorInApp" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "likeCreatorInApp" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mentionedInApp" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "replyCommentInApp" BOOLEAN NOT NULL DEFAULT true;
