/*
  Warnings:

  - Added the required column `creatorId` to the `fan_referral_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fanReferralId` to the `fan_referral_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "fan_referral_transactions" ADD COLUMN     "creatorId" BIGINT NOT NULL,
ADD COLUMN     "fanReferralId" BIGINT NOT NULL;

-- AddForeignKey
ALTER TABLE "fan_referral_transactions" ADD CONSTRAINT "fan_referral_transactions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fan_referral_transactions" ADD CONSTRAINT "fan_referral_transactions_fanReferralId_fkey" FOREIGN KEY ("fanReferralId") REFERENCES "fan_referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
