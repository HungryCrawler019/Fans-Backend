-- CreateTable
CREATE TABLE "blocked_creators" (
    "userId" BIGINT NOT NULL,
    "creatorId" BIGINT NOT NULL,

    CONSTRAINT "blocked_creators_pkey" PRIMARY KEY ("userId","creatorId")
);

-- AddForeignKey
ALTER TABLE "blocked_creators" ADD CONSTRAINT "blocked_creators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_creators" ADD CONSTRAINT "blocked_creators_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
