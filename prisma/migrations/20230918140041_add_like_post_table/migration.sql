-- CreateTable
CREATE TABLE "like_posts" (
    "userId" BIGINT NOT NULL,
    "postId" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "like_posts_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateIndex
CREATE INDEX "like_posts_userId_idx" ON "like_posts"("userId");

-- CreateIndex
CREATE INDEX "like_posts_postId_idx" ON "like_posts"("postId");

-- CreateIndex
CREATE INDEX "like_posts_updatedAt_idx" ON "like_posts"("updatedAt");

-- AddForeignKey
ALTER TABLE "like_posts" ADD CONSTRAINT "like_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "like_posts" ADD CONSTRAINT "like_posts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
