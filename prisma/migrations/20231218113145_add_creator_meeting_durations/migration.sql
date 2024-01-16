-- CreateTable
CREATE TABLE "creator_meeting_durations" (
    "id" BIGINT NOT NULL,
    "length" INTEGER NOT NULL,
    "creatorId" BIGINT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "creator_meeting_durations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "creator_meeting_durations_creatorId_idx" ON "creator_meeting_durations"("creatorId");

-- AddForeignKey
ALTER TABLE "creator_meeting_durations" ADD CONSTRAINT "creator_meeting_durations_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
