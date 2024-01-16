/*
  Warnings:

  - You are about to drop the `story_medias` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "story_medias" DROP CONSTRAINT "story_medias_storyId_fkey";

-- DropForeignKey
ALTER TABLE "story_medias" DROP CONSTRAINT "story_medias_uploadId_fkey";

-- AlterTable
ALTER TABLE "stories" ADD COLUMN     "medias" TEXT[];

-- DropTable
DROP TABLE "story_medias";
