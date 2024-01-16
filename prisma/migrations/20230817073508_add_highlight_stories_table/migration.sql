/*
  Warnings:

  - You are about to drop the column `resources` on the `highlights` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "highlights" DROP COLUMN "resources";

-- CreateTable
CREATE TABLE "highlight_stories" (
    "highlightId" BIGINT NOT NULL,
    "storyId" BIGINT NOT NULL,

    CONSTRAINT "highlight_stories_pkey" PRIMARY KEY ("highlightId","storyId")
);

-- CreateIndex
CREATE INDEX "highlight_stories_highlightId_idx" ON "highlight_stories"("highlightId");

-- CreateIndex
CREATE INDEX "highlight_stories_storyId_idx" ON "highlight_stories"("storyId");

-- AddForeignKey
ALTER TABLE "highlight_stories" ADD CONSTRAINT "highlight_stories_highlightId_fkey" FOREIGN KEY ("highlightId") REFERENCES "highlights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "highlight_stories" ADD CONSTRAINT "highlight_stories_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
