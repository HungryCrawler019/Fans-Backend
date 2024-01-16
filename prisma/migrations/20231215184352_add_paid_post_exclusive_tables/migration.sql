-- CreateTable
CREATE TABLE "tier_posts" (
    "id" BIGINT NOT NULL,
    "tierId" BIGINT NOT NULL,
    "postId" BIGINT NOT NULL,

    CONSTRAINT "tier_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_posts" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "postId" BIGINT NOT NULL,

    CONSTRAINT "user_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tier_posts_tierId_idx" ON "tier_posts"("tierId");

-- CreateIndex
CREATE INDEX "tier_posts_postId_idx" ON "tier_posts"("postId");

-- CreateIndex
CREATE INDEX "user_posts_userId_idx" ON "user_posts"("userId");

-- CreateIndex
CREATE INDEX "user_posts_postId_idx" ON "user_posts"("postId");

-- AddForeignKey
ALTER TABLE "tier_posts" ADD CONSTRAINT "tier_posts_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tier_posts" ADD CONSTRAINT "tier_posts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_posts" ADD CONSTRAINT "user_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_posts" ADD CONSTRAINT "user_posts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
