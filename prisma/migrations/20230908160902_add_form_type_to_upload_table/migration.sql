-- AlterEnum
ALTER TYPE "UploadType" ADD VALUE 'Form';

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "formId" BIGINT;

-- AlterTable
ALTER TABLE "uploads" ADD COLUMN     "origin" TEXT;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_formId_fkey" FOREIGN KEY ("formId") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
