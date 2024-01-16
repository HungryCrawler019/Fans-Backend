-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('Initialize', 'Success', 'Failure');

-- AlterTable
ALTER TABLE "uploads" ADD COLUMN     "status" "UploadStatus" NOT NULL DEFAULT 'Initialize';
