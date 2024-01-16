-- CreateEnum
CREATE TYPE "WeekDay" AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');

-- CreateTable
CREATE TABLE "creator_meeting_intervals" (
    "id" BIGINT NOT NULL,
    "day" "WeekDay" NOT NULL,
    "creatorId" BIGINT NOT NULL,
    "startTime" TIME NOT NULL,
    "length" INTEGER NOT NULL,

    CONSTRAINT "creator_meeting_intervals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "creator_meeting_intervals_creatorId_idx" ON "creator_meeting_intervals"("creatorId");

-- CreateIndex
CREATE INDEX "profiles_userId_idx" ON "profiles"("userId");

-- AddForeignKey
ALTER TABLE "creator_meeting_intervals" ADD CONSTRAINT "creator_meeting_intervals_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
