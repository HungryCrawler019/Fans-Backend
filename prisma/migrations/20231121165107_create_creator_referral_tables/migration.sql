-- CreateEnum
CREATE TYPE "CreatorReferralTransactionType" AS ENUM ('Tip', 'Subscription', 'PaidPost');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "referrerCode" TEXT;

-- CreateTable
CREATE TABLE "creator_referrals" (
    "id" BIGINT NOT NULL,
    "profileId" BIGINT NOT NULL,
    "code" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_referral_transactions" (
    "id" BIGINT NOT NULL,
    "referentId" BIGINT NOT NULL,
    "referrerId" BIGINT NOT NULL,
    "type" "CreatorReferralTransactionType" NOT NULL,
    "transactionId" BIGINT NOT NULL,
    "amount" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_referral_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "creator_referrals_code_key" ON "creator_referrals"("code");

-- CreateIndex
CREATE INDEX "creator_referrals_profileId_idx" ON "creator_referrals"("profileId");

-- CreateIndex
CREATE INDEX "creator_referrals_code_idx" ON "creator_referrals" USING HASH ("code");

-- CreateIndex
CREATE INDEX "creator_referral_transactions_referentId_idx" ON "creator_referral_transactions"("referentId");

-- CreateIndex
CREATE INDEX "creator_referral_transactions_referrerId_idx" ON "creator_referral_transactions"("referrerId");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_referrerCode_fkey" FOREIGN KEY ("referrerCode") REFERENCES "creator_referrals"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_referrals" ADD CONSTRAINT "creator_referrals_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_referral_transactions" ADD CONSTRAINT "creator_referral_transactions_referentId_fkey" FOREIGN KEY ("referentId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_referral_transactions" ADD CONSTRAINT "creator_referral_transactions_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
