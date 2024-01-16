-- CreateTable
CREATE TABLE "story_likes" (
    "storyId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_likes_pkey" PRIMARY KEY ("storyId","userId")
);

-- AddForeignKey
ALTER TABLE "story_likes" ADD CONSTRAINT "story_likes_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_likes" ADD CONSTRAINT "story_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
