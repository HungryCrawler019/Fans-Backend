-- CreateTable
CREATE TABLE "welcome_messages" (
    "id" BIGINT NOT NULL,
    "profileId" BIGINT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL,
    "image" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "welcome_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "welcome_messages_profileId_idx" ON "welcome_messages"("profileId");

-- CreateIndex
CREATE INDEX "welcome_messages_updatedAt_idx" ON "welcome_messages"("updatedAt");

-- AddForeignKey
ALTER TABLE "welcome_messages" ADD CONSTRAINT "welcome_messages_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
