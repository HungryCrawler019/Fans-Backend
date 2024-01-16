-- DropForeignKey
ALTER TABLE "hidden_posts" DROP CONSTRAINT "hidden_posts_userId_fkey";

-- DropForeignKey
ALTER TABLE "hidden_posts" DROP CONSTRAINT "hidden_posts_postId_fkey";

-- DropTable
DROP TABLE "hidden_posts";

