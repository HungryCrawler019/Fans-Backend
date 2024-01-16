/*
  Warnings:

  - You are about to drop the column `status` on the `uploads` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "uploads" DROP COLUMN "status";

-- DropEnum
DROP TYPE "UploadStatus";
