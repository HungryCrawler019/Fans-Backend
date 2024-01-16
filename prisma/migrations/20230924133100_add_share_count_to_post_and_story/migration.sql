-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "shareCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "stories" ADD COLUMN     "shareCount" INTEGER NOT NULL DEFAULT 0;
