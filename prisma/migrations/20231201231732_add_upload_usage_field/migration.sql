-- CreateEnum
CREATE TYPE "UploadUsageType" AS ENUM ('POST', 'CHAT');

-- AlterTable
ALTER TABLE "uploads" ADD COLUMN     "usage" "UploadUsageType" NOT NULL DEFAULT 'POST';

-- CreateTable
CREATE TABLE "_MessageToUpload" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_MessageToUpload_AB_unique" ON "_MessageToUpload"("A", "B");

-- CreateIndex
CREATE INDEX "_MessageToUpload_B_index" ON "_MessageToUpload"("B");

-- AddForeignKey
ALTER TABLE "_MessageToUpload" ADD CONSTRAINT "_MessageToUpload_A_fkey" FOREIGN KEY ("A") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MessageToUpload" ADD CONSTRAINT "_MessageToUpload_B_fkey" FOREIGN KEY ("B") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
