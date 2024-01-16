-- AddForeignKey
ALTER TABLE "story_comments" ADD CONSTRAINT "story_comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "story_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
