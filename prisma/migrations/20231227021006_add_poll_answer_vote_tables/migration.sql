
-- CreateTable
CREATE TABLE "poll_answers" (
    "id" BIGINT NOT NULL,
    "pollId" BIGINT NOT NULL,
    "answer" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poll_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_votes" (
    "id" BIGINT NOT NULL,
    "pollAnswerId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "poll_answers_pollId_idx" ON "poll_answers"("pollId");

-- CreateIndex
CREATE INDEX "poll_answers_updatedAt_idx" ON "poll_answers"("updatedAt");

-- CreateIndex
CREATE INDEX "poll_votes_pollAnswerId_idx" ON "poll_votes"("pollAnswerId");

-- CreateIndex
CREATE INDEX "poll_votes_userId_idx" ON "poll_votes"("userId");

-- CreateIndex
CREATE INDEX "poll_votes_updatedAt_idx" ON "poll_votes"("updatedAt");

-- AddForeignKey
ALTER TABLE "poll_answers" ADD CONSTRAINT "poll_answers_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_pollAnswerId_fkey" FOREIGN KEY ("pollAnswerId") REFERENCES "poll_answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
