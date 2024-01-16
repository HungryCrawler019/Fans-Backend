/*
  Warnings:

  - You are about to drop the column `bookmarkCount` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `commentCount` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `likeCount` on the `posts` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "posts_commentCount_idx";

-- DropIndex
DROP INDEX "posts_likeCount_idx";

-- AlterTable
ALTER TABLE "posts" DROP COLUMN "bookmarkCount",
DROP COLUMN "commentCount",
DROP COLUMN "likeCount";
