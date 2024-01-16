/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `fan_referral` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "payment_subscriptions" ADD COLUMN     "fanReferralCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "fan_referral_code_key" ON "fan_referral"("code");

-- AddForeignKey
ALTER TABLE "payment_subscriptions" ADD CONSTRAINT "payment_subscriptions_fanReferralCode_fkey" FOREIGN KEY ("fanReferralCode") REFERENCES "fan_referral"("code") ON DELETE SET NULL ON UPDATE CASCADE;
