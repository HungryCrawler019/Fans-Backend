-- AlterTable
ALTER TABLE "stories" DROP COLUMN "medias";

-- CreateTable
CREATE TABLE "story_medias" (
    "storyId" BIGINT NOT NULL,
    "uploadId" BIGINT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "story_medias_storyId_uploadId_key" ON "story_medias"("storyId" ASC, "uploadId" ASC);

-- AddForeignKey
ALTER TABLE "story_medias" ADD CONSTRAINT "story_medias_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_medias" ADD CONSTRAINT "story_medias_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

