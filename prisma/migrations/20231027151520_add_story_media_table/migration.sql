-- CreateTable
CREATE TABLE "story_medias" (
    "id" BIGINT NOT NULL,
    "uploadId" BIGINT NOT NULL,
    "storyId" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_medias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "story_medias_uploadId_idx" ON "story_medias"("uploadId");

-- CreateIndex
CREATE INDEX "story_medias_storyId_idx" ON "story_medias"("storyId");

-- AddForeignKey
ALTER TABLE "story_medias" ADD CONSTRAINT "story_medias_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_medias" ADD CONSTRAINT "story_medias_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
