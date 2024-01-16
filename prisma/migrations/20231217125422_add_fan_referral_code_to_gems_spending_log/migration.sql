-- AlterTable
ALTER TABLE "gems_spending_logs" ADD COLUMN     "fanReferralCode" TEXT;

-- AlterTable
ALTER TABLE "paid_post_transactions" ADD COLUMN     "fanReferralCode" TEXT;

-- AddForeignKey
ALTER TABLE "gems_spending_logs" ADD CONSTRAINT "gems_spending_logs_fanReferralCode_fkey" FOREIGN KEY ("fanReferralCode") REFERENCES "fan_referral"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paid_post_transactions" ADD CONSTRAINT "paid_post_transactions_fanReferralCode_fkey" FOREIGN KEY ("fanReferralCode") REFERENCES "fan_referral"("code") ON DELETE SET NULL ON UPDATE CASCADE;
