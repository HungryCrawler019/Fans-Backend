/*
  Warnings:

  - A unique constraint covering the columns `[creatorId,length]` on the table `creator_meeting_durations` will be added. If there are existing duplicate values, this will fail.

*/

-- CreateIndex
CREATE UNIQUE INDEX "creator_meeting_durations_creatorId_length_key" ON "creator_meeting_durations"("creatorId", "length");
