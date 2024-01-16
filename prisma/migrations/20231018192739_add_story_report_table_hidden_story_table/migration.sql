-- CreateEnum
CREATE TYPE "StoryReportFlag" AS ENUM ('ILLEGAL_CONTENT', 'UNDERAGE_CONTENT', 'GRAPHIC_VOILENCE_OR_GORE', 'HARASSMENT_OR_BULLYING', 'SELF_HARM_OR_SUICIDE_CONTENT', 'NON_CONSENSUAL_CONTENT', 'SPAM_OR_SCAM', 'INFRINGEMENT_OF_MY_COPYRIGHT', 'OTHER');

-- CreateTable
CREATE TABLE "hidden_stories" (
    "userId" BIGINT NOT NULL,
    "storyId" BIGINT NOT NULL,

    CONSTRAINT "hidden_stories_pkey" PRIMARY KEY ("userId","storyId")
);

-- CreateTable
CREATE TABLE "reports_for_story" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "storyId" BIGINT NOT NULL,
    "flag" "StoryReportFlag" NOT NULL DEFAULT 'OTHER',
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_for_story_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hidden_stories_userId_idx" ON "hidden_stories"("userId");

-- CreateIndex
CREATE INDEX "hidden_stories_storyId_idx" ON "hidden_stories"("storyId");

-- CreateIndex
CREATE INDEX "reports_for_story_userId_idx" ON "reports_for_story"("userId");

-- CreateIndex
CREATE INDEX "reports_for_story_storyId_idx" ON "reports_for_story"("storyId");

-- CreateIndex
CREATE INDEX "reports_for_story_status_idx" ON "reports_for_story" USING HASH ("status");

-- CreateIndex
CREATE INDEX "reports_for_story_reason_idx" ON "reports_for_story"("reason");

-- CreateIndex
CREATE INDEX "reports_for_story_updatedAt_idx" ON "reports_for_story"("updatedAt");

-- AddForeignKey
ALTER TABLE "hidden_stories" ADD CONSTRAINT "hidden_stories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_stories" ADD CONSTRAINT "hidden_stories_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports_for_story" ADD CONSTRAINT "reports_for_story_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports_for_story" ADD CONSTRAINT "reports_for_story_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
