-- CreateTable
CREATE TABLE "referral_links" (
    "id" BIGINT NOT NULL,
    "profileId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "code" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "referral_links_profileId_idx" ON "referral_links"("profileId");

-- CreateIndex
CREATE INDEX "referral_links_userId_idx" ON "referral_links"("userId");

-- CreateIndex
CREATE INDEX "referral_links_code_idx" ON "referral_links" USING HASH ("code");

-- AddForeignKey
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
