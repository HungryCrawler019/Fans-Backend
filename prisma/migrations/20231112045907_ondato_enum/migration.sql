/*
  Warnings:

  - The values [ACCEPTED,DENIED,SIGNATURE,PHOTO_ID] on the enum `AgeVerifyStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;

UPDATE "users" SET "ageVerifyId" = NULL;
UPDATE "users" SET "ageVerifyStatus" = NULL;
UPDATE "profiles" SET "ageVerifyId" = NULL;
UPDATE "profiles" SET "ageVerifyStatus" = NULL;

CREATE TYPE "AgeVerifyStatus_new" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ABORTED', 'EXPIRED');
ALTER TABLE "users" ALTER COLUMN "ageVerifyStatus" TYPE "AgeVerifyStatus_new" USING ("ageVerifyStatus"::text::"AgeVerifyStatus_new");
ALTER TABLE "profiles" ALTER COLUMN "ageVerifyStatus" TYPE "AgeVerifyStatus_new" USING ("ageVerifyStatus"::text::"AgeVerifyStatus_new");
ALTER TYPE "AgeVerifyStatus" RENAME TO "AgeVerifyStatus_old";
ALTER TYPE "AgeVerifyStatus_new" RENAME TO "AgeVerifyStatus";
DROP TYPE "AgeVerifyStatus_old";
COMMIT;
