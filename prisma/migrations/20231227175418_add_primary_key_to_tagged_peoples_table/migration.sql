-- DropIndex
DROP INDEX "tagged_peoples_postId_userId_key";

-- AlterTable
ALTER TABLE "tagged_peoples" ADD CONSTRAINT "tagged_peoples_pkey" PRIMARY KEY ("id");
