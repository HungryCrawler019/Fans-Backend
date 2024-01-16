/*
  Warnings:

  - The values [IN_PROGRESS,COMPLETED,ABORTED,EXPIRED] on the enum `AgeVerifyStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AgeVerifyStatus_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
ALTER TABLE "users" ALTER COLUMN "ageVerifyStatus" TYPE "AgeVerifyStatus_new" USING ("ageVerifyStatus"::text::"AgeVerifyStatus_new");
ALTER TABLE "profiles" ALTER COLUMN "ageVerifyStatus" TYPE "AgeVerifyStatus_new" USING ("ageVerifyStatus"::text::"AgeVerifyStatus_new");
ALTER TYPE "AgeVerifyStatus" RENAME TO "AgeVerifyStatus_old";
ALTER TYPE "AgeVerifyStatus_new" RENAME TO "AgeVerifyStatus";
DROP TYPE "AgeVerifyStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "ageVerifyKycId" TEXT;

-- CreateIndex
CREATE INDEX "users_ageVerifyKycId_idx" ON "users"("ageVerifyKycId");

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "ageVerifyReason" TEXT;
