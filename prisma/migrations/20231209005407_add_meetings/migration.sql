-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('OneOnOne_TwoWay', 'OneOnOne_OneWay');

-- CreateTable
CREATE TABLE "meetings" (
    "id" BIGINT NOT NULL,
    "type" "MeetingType" NOT NULL,
    "hostId" BIGINT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "chimeMeetingId" TEXT NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_users" (
    "meetingId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,

    CONSTRAINT "meeting_users_pkey" PRIMARY KEY ("meetingId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "meetings_chimeMeetingId_key" ON "meetings"("chimeMeetingId");

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_users" ADD CONSTRAINT "meeting_users_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_users" ADD CONSTRAINT "meeting_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
