/*
  Warnings:

  - You are about to drop the column `isEnabled` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `isAdmin` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isModerator` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "profiles_isEnabled_idx";

-- DropIndex
DROP INDEX "users_isAdmin_idx";

-- DropIndex
DROP INDEX "users_isModerator_idx";

-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "isEnabled",
ADD COLUMN     "disabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "flags" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "isAdmin",
DROP COLUMN "isModerator",
ADD COLUMN     "disabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ban_logs" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "adminId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ban_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ban_logs_userId_idx" ON "ban_logs"("userId");

-- CreateIndex
CREATE INDEX "ban_logs_createdAt_idx" ON "ban_logs"("createdAt");

-- CreateIndex
CREATE INDEX "creator_meeting_durations_length_idx" ON "creator_meeting_durations"("length");

-- CreateIndex
CREATE INDEX "creator_meeting_durations_price_idx" ON "creator_meeting_durations"("price");

-- CreateIndex
CREATE INDEX "creator_meeting_durations_isEnabled_idx" ON "creator_meeting_durations" USING HASH ("isEnabled");

-- CreateIndex
CREATE INDEX "creator_referral_transactions_type_idx" ON "creator_referral_transactions" USING HASH ("type");

-- CreateIndex
CREATE INDEX "creator_referral_transactions_transactionId_idx" ON "creator_referral_transactions"("transactionId");

-- CreateIndex
CREATE INDEX "creator_referral_transactions_amount_idx" ON "creator_referral_transactions"("amount");

-- CreateIndex
CREATE INDEX "fan_referral_transactions_fanReferralId_idx" ON "fan_referral_transactions"("fanReferralId");

-- CreateIndex
CREATE INDEX "fan_referral_transactions_type_idx" ON "fan_referral_transactions" USING HASH ("type");

-- CreateIndex
CREATE INDEX "fan_referral_transactions_transactionId_idx" ON "fan_referral_transactions"("transactionId");

-- CreateIndex
CREATE INDEX "fan_referral_transactions_amount_idx" ON "fan_referral_transactions"("amount");

-- CreateIndex
CREATE INDEX "meetings_hostId_idx" ON "meetings"("hostId");

-- CreateIndex
CREATE INDEX "meetings_startDate_idx" ON "meetings"("startDate");

-- CreateIndex
CREATE INDEX "meetings_endDate_idx" ON "meetings"("endDate");

-- CreateIndex
CREATE INDEX "meetings_chimeMeetingId_idx" ON "meetings"("chimeMeetingId");

-- CreateIndex
CREATE INDEX "meetings_prepareJobId_idx" ON "meetings"("prepareJobId");

-- CreateIndex
CREATE INDEX "meetings_cleanJobId_idx" ON "meetings"("cleanJobId");

-- CreateIndex
CREATE INDEX "otp_code_email_idx" ON "otp_code"("email");

-- CreateIndex
CREATE INDEX "playlists_viewCount_idx" ON "playlists"("viewCount");

-- CreateIndex
CREATE INDEX "profile_previews_profileId_idx" ON "profile_previews"("profileId");

-- CreateIndex
CREATE INDEX "profiles_verified_idx" ON "profiles"("verified");

-- CreateIndex
CREATE INDEX "profiles_flags_idx" ON "profiles"("flags");

-- CreateIndex
CREATE INDEX "profiles_disabled_idx" ON "profiles" USING HASH ("disabled");

-- CreateIndex
CREATE INDEX "profiles_billingPaused_idx" ON "profiles" USING HASH ("billingPaused");

-- CreateIndex
CREATE INDEX "profiles_explicitCommentFilter_idx" ON "profiles" USING HASH ("explicitCommentFilter");

-- CreateIndex
CREATE INDEX "profiles_hideComments_idx" ON "profiles" USING HASH ("hideComments");

-- CreateIndex
CREATE INDEX "profiles_hideLikes_idx" ON "profiles" USING HASH ("hideLikes");

-- CreateIndex
CREATE INDEX "profiles_hideTips_idx" ON "profiles" USING HASH ("hideTips");

-- CreateIndex
CREATE INDEX "profiles_isPremium_idx" ON "profiles" USING HASH ("isPremium");

-- CreateIndex
CREATE INDEX "profiles_showProfile_idx" ON "profiles" USING HASH ("showProfile");

-- CreateIndex
CREATE INDEX "profiles_uploadedVideoDuration_idx" ON "profiles"("uploadedVideoDuration");

-- CreateIndex
CREATE INDEX "profiles_referrerCode_idx" ON "profiles"("referrerCode");

-- CreateIndex
CREATE INDEX "stories_isHighlight_idx" ON "stories" USING HASH ("isHighlight");

-- CreateIndex
CREATE INDEX "stories_isArchived_idx" ON "stories" USING HASH ("isArchived");

-- CreateIndex
CREATE INDEX "stories_shareCount_idx" ON "stories"("shareCount");

-- CreateIndex
CREATE INDEX "uploads_storage_idx" ON "uploads" USING HASH ("storage");

-- CreateIndex
CREATE INDEX "uploads_usage_idx" ON "uploads" USING HASH ("usage");

-- CreateIndex
CREATE INDEX "uploads_completed_idx" ON "uploads" USING HASH ("completed");

-- CreateIndex
CREATE INDEX "uploads_isPinned_idx" ON "uploads" USING HASH ("isPinned");

-- CreateIndex
CREATE INDEX "uploads_length_idx" ON "uploads"("length");

-- CreateIndex
CREATE INDEX "users_displayName_idx" ON "users"("displayName");

-- CreateIndex
CREATE INDEX "users_country_idx" ON "users"("country");

-- CreateIndex
CREATE INDEX "users_language_idx" ON "users" USING HASH ("language");

-- CreateIndex
CREATE INDEX "users_disabled_idx" ON "users" USING HASH ("disabled");

-- AddForeignKey
ALTER TABLE "ban_logs" ADD CONSTRAINT "ban_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrate verified field by setting the flag 0x01 if the user is verified
UPDATE "profiles" SET "flags" = "flags" | 1 WHERE "verified" = true;
