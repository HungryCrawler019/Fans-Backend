-- AlterTable
ALTER TABLE "paid_posts" ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "isDisplayShop" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "uploads" ADD COLUMN     "length" INTEGER NOT NULL DEFAULT 0;
