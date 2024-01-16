-- DropForeignKey
ALTER TABLE "highlight_stories" DROP CONSTRAINT "highlight_stories_highlightId_fkey";

-- DropForeignKey
ALTER TABLE "highlight_stories" DROP CONSTRAINT "highlight_stories_storyId_fkey";

-- AlterTable
ALTER TABLE "highlights" ADD COLUMN     "resources" TEXT[];

-- DropTable
DROP TABLE "highlight_stories";

