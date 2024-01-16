/*
  Warnings:

  - You are about to drop the column `formId` on the `posts` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "posts" DROP CONSTRAINT "posts_formId_fkey";

-- AlterTable
ALTER TABLE "posts" DROP COLUMN "formId";

-- CreateTable
CREATE TABLE "post_forms" (
    "postId" BIGINT NOT NULL,
    "uploadId" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_forms_pkey" PRIMARY KEY ("postId","uploadId")
);

-- CreateIndex
CREATE UNIQUE INDEX "post_forms_uploadId_key" ON "post_forms"("uploadId");

-- CreateIndex
CREATE INDEX "post_forms_postId_idx" ON "post_forms"("postId");

-- CreateIndex
CREATE INDEX "post_forms_uploadId_idx" ON "post_forms"("uploadId");

-- AddForeignKey
ALTER TABLE "post_forms" ADD CONSTRAINT "post_forms_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_forms" ADD CONSTRAINT "post_forms_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
