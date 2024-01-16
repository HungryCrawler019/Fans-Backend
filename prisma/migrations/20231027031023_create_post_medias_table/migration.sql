-- CreateTable
CREATE TABLE "post_medias" (
    "id" BIGINT NOT NULL,
    "uploadId" BIGINT NOT NULL,
    "postId" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_medias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_medias_uploadId_idx" ON "post_medias"("uploadId");

-- CreateIndex
CREATE INDEX "post_medias_postId_idx" ON "post_medias"("postId");

-- AddForeignKey
ALTER TABLE "post_medias" ADD CONSTRAINT "post_medias_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_medias" ADD CONSTRAINT "post_medias_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
