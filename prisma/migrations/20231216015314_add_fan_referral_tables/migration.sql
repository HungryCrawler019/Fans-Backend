/*
  Warnings:

  - You are about to drop the column `isReferralEnabled` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `revenueShare` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the `referral_links` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "FanReferralTransactionType" AS ENUM ('Tip', 'Subscription', 'PaidPost');

-- DropForeignKey
ALTER TABLE "referral_links" DROP CONSTRAINT "referral_links_profileId_fkey";

-- DropForeignKey
ALTER TABLE "referral_links" DROP CONSTRAINT "referral_links_userId_fkey";

-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "isReferralEnabled",
DROP COLUMN "revenueShare",
ADD COLUMN     "fanReferralShare" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isFanReferralEnabled" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "referral_links";

-- CreateTable
CREATE TABLE "fan_referral" (
    "id" BIGINT NOT NULL,
    "profileId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "code" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fan_referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fan_referral_transactions" (
    "id" BIGINT NOT NULL,
    "referentId" BIGINT NOT NULL,
    "referrerId" BIGINT NOT NULL,
    "type" "FanReferralTransactionType" NOT NULL,
    "transactionId" BIGINT NOT NULL,
    "amount" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fan_referral_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fan_referral_profileId_idx" ON "fan_referral"("profileId");

-- CreateIndex
CREATE INDEX "fan_referral_userId_idx" ON "fan_referral"("userId");

-- CreateIndex
CREATE INDEX "fan_referral_code_idx" ON "fan_referral" USING HASH ("code");

-- CreateIndex
CREATE INDEX "fan_referral_transactions_referentId_idx" ON "fan_referral_transactions"("referentId");

-- CreateIndex
CREATE INDEX "fan_referral_transactions_referrerId_idx" ON "fan_referral_transactions"("referrerId");

-- AddForeignKey
ALTER TABLE "fan_referral" ADD CONSTRAINT "fan_referral_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fan_referral" ADD CONSTRAINT "fan_referral_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fan_referral_transactions" ADD CONSTRAINT "fan_referral_transactions_referentId_fkey" FOREIGN KEY ("referentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fan_referral_transactions" ADD CONSTRAINT "fan_referral_transactions_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
