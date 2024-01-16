-- DropForeignKey
ALTER TABLE "blocked_creators" DROP CONSTRAINT "blocked_creators_userId_fkey";

-- DropForeignKey
ALTER TABLE "blocked_creators" DROP CONSTRAINT "blocked_creators_creatorId_fkey";

-- DropTable
DROP TABLE "blocked_creators";

