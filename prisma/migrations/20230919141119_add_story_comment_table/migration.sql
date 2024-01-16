-- CreateTable
CREATE TABLE "story_comments" (
    "id" BIGINT NOT NULL,
    "storyId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "parentCommentId" BIGINT,
    "content" TEXT NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_comment_likes" (
    "storyCommentId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_comment_likes_pkey" PRIMARY KEY ("storyCommentId","userId")
);

-- CreateIndex
CREATE INDEX "story_comments_storyId_idx" ON "story_comments"("storyId");

-- CreateIndex
CREATE INDEX "story_comments_userId_idx" ON "story_comments"("userId");

-- AddForeignKey
ALTER TABLE "story_comments" ADD CONSTRAINT "story_comments_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_comments" ADD CONSTRAINT "story_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_comment_likes" ADD CONSTRAINT "story_comment_likes_storyCommentId_fkey" FOREIGN KEY ("storyCommentId") REFERENCES "story_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_comment_likes" ADD CONSTRAINT "story_comment_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
