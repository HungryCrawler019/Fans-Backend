-- CreateEnum
CREATE TYPE "AgeVerifyStatus" AS ENUM ('ACCEPTED', 'DENIED', 'SIGNATURE', 'PHOTO_ID', 'PENDING');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "ageVerifyId" TEXT,
ADD COLUMN     "ageVerifyStatus" "AgeVerifyStatus";
