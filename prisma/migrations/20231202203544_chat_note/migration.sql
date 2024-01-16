-- CreateTable
CREATE TABLE "chat_notes" (
    "id" BIGINT NOT NULL,
    "profileId" BIGINT NOT NULL,
    "note" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_notes_profileId_idx" ON "chat_notes"("profileId");

-- CreateIndex
CREATE INDEX "chat_notes_updatedAt_idx" ON "chat_notes"("updatedAt");

-- AddForeignKey
ALTER TABLE "chat_notes" ADD CONSTRAINT "chat_notes_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
