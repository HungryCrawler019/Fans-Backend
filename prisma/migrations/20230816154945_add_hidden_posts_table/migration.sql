-- CreateTable
CREATE TABLE "hidden_posts" (
    "userId" BIGINT NOT NULL,
    "postId" BIGINT NOT NULL,

    CONSTRAINT "hidden_posts_pkey" PRIMARY KEY ("userId","postId")
);

-- AddForeignKey
ALTER TABLE "hidden_posts" ADD CONSTRAINT "hidden_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_posts" ADD CONSTRAINT "hidden_posts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
