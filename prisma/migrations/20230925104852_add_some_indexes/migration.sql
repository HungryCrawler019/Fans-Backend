-- DropIndex
DROP INDEX "bookmarks_userId_postId_key";

-- AlterTable
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("userId", "postId");

-- CreateIndex
CREATE INDEX "blocked_creators_userId_idx" ON "blocked_creators"("userId");

-- CreateIndex
CREATE INDEX "blocked_creators_creatorId_idx" ON "blocked_creators"("creatorId");

-- CreateIndex
CREATE INDEX "bookmarks_userId_idx" ON "bookmarks"("userId");

-- CreateIndex
CREATE INDEX "bookmarks_postId_idx" ON "bookmarks"("postId");

-- CreateIndex
CREATE INDEX "hidden_posts_userId_idx" ON "hidden_posts"("userId");

-- CreateIndex
CREATE INDEX "hidden_posts_postId_idx" ON "hidden_posts"("postId");

-- CreateIndex
CREATE INDEX "limit_payment_users_creatorId_idx" ON "limit_payment_users"("creatorId");

-- CreateIndex
CREATE INDEX "limit_payment_users_userId_idx" ON "limit_payment_users"("userId");

-- CreateIndex
CREATE INDEX "story_comment_likes_storyCommentId_idx" ON "story_comment_likes"("storyCommentId");

-- CreateIndex
CREATE INDEX "story_comment_likes_userId_idx" ON "story_comment_likes"("userId");

-- CreateIndex
CREATE INDEX "story_comments_parentCommentId_idx" ON "story_comments"("parentCommentId");
