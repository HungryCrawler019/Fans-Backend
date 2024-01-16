-- CreateEnum
CREATE TYPE "UploadStorageType" AS ENUM ('S3', 'CLOUDFLARE_STREAM');

-- AlterTable
ALTER TABLE "uploads" ADD COLUMN "storage" "UploadStorageType";

UPDATE "uploads" SET "storage" = 'S3' WHERE "storage" IS NULL;

ALTER TABLE "uploads" ALTER COLUMN "storage" SET NOT NULL;
