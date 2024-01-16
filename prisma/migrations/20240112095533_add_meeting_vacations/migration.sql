-- CreateTable
CREATE TABLE "meeting_vacations" (
    "id" BIGINT NOT NULL,
    "creatorId" BIGINT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_vacations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meeting_vacations_creatorId_idx" ON "meeting_vacations"("creatorId");

-- AddForeignKey
ALTER TABLE "meeting_vacations" ADD CONSTRAINT "meeting_vacations_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
