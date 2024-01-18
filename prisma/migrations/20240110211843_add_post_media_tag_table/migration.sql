-- CreateTable
CREATE TABLE "post_media_tag" (
    "id" BIGINT NOT NULL,
    "postMediaId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "pointX" INTEGER NOT NULL DEFAULT 0,
    "pointY" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_media_tag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_media_tag_postMediaId_idx" ON "post_media_tag"("postMediaId");

-- CreateIndex
CREATE INDEX "post_media_tag_userId_idx" ON "post_media_tag"("userId");

-- AddForeignKey
ALTER TABLE "post_media_tag" ADD CONSTRAINT "post_media_tag_postMediaId_fkey" FOREIGN KEY ("postMediaId") REFERENCES "post_medias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_media_tag" ADD CONSTRAINT "post_media_tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
