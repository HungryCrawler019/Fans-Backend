-- AlterTable
ALTER TABLE "fundraisers" ADD COLUMN     "thumbId" BIGINT;

-- AlterTable
ALTER TABLE "giveaways" ADD COLUMN     "thumbId" BIGINT;

-- AlterTable
ALTER TABLE "paid_posts" ADD COLUMN     "thumbId" BIGINT;

-- AlterTable
ALTER TABLE "playlists" ADD COLUMN     "thumbId" BIGINT;

-- AlterTable
ALTER TABLE "polls" ADD COLUMN     "thumbId" BIGINT;

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "thumbId" BIGINT;

-- CreateIndex
CREATE INDEX "fundraisers_thumbId_idx" ON "fundraisers"("thumbId");

-- CreateIndex
CREATE INDEX "giveaways_thumbId_idx" ON "giveaways"("thumbId");

-- CreateIndex
CREATE INDEX "paid_posts_thumbId_idx" ON "paid_posts"("thumbId");

-- CreateIndex
CREATE INDEX "playlists_thumbId_idx" ON "playlists"("thumbId");

-- CreateIndex
CREATE INDEX "polls_thumbId_idx" ON "polls"("thumbId");

-- CreateIndex
CREATE INDEX "posts_thumbId_idx" ON "posts"("thumbId");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_thumbId_fkey" FOREIGN KEY ("thumbId") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paid_posts" ADD CONSTRAINT "paid_posts_thumbId_fkey" FOREIGN KEY ("thumbId") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fundraisers" ADD CONSTRAINT "fundraisers_thumbId_fkey" FOREIGN KEY ("thumbId") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giveaways" ADD CONSTRAINT "giveaways_thumbId_fkey" FOREIGN KEY ("thumbId") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polls" ADD CONSTRAINT "polls_thumbId_fkey" FOREIGN KEY ("thumbId") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_thumbId_fkey" FOREIGN KEY ("thumbId") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
