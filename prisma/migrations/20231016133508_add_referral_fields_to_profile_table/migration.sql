-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "isReferralEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketingContentLink" TEXT,
ADD COLUMN     "revenueShare" INTEGER NOT NULL DEFAULT 0;
