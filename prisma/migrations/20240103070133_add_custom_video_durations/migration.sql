-- CreateTable
CREATE TABLE "custom_video_durations" (
    "id" BIGINT NOT NULL,
    "length" INTEGER NOT NULL,
    "creatorId" BIGINT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "custom_video_durations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_video_durations_creatorId_idx" ON "custom_video_durations"("creatorId");

-- AddForeignKey
ALTER TABLE "custom_video_durations" ADD CONSTRAINT "custom_video_durations_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
