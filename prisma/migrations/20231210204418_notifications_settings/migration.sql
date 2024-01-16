-- CreateTable
CREATE TABLE "notifications_settings" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT,
    "profileId" BIGINT,
    "newSubscriberCreatorEmail" BOOLEAN NOT NULL DEFAULT false,
    "tipCreatorEmail" BOOLEAN NOT NULL DEFAULT false,
    "paidPostCreatorEmail" BOOLEAN NOT NULL DEFAULT false,
    "messageCreatorEmail" BOOLEAN NOT NULL DEFAULT false,
    "messageFanEmail" BOOLEAN NOT NULL DEFAULT false,
    "transactionFanEmail" BOOLEAN NOT NULL DEFAULT false,
    "newPostFanEmail" BOOLEAN NOT NULL DEFAULT false,
    "newSubscriberCreatorInApp" BOOLEAN NOT NULL DEFAULT false,
    "tipCreatorInApp" BOOLEAN NOT NULL DEFAULT false,
    "paidPostCreatorInApp" BOOLEAN NOT NULL DEFAULT false,
    "messageCreatorInApp" BOOLEAN NOT NULL DEFAULT false,
    "messageFanInApp" BOOLEAN NOT NULL DEFAULT false,
    "transactionFanInApp" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notifications_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_settings_userId_key" ON "notifications_settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_settings_profileId_key" ON "notifications_settings"("profileId");

-- CreateIndex
CREATE INDEX "notifications_settings_userId_idx" ON "notifications_settings"("userId");

-- CreateIndex
CREATE INDEX "notifications_settings_profileId_idx" ON "notifications_settings"("profileId");

-- AddForeignKey
ALTER TABLE "notifications_settings" ADD CONSTRAINT "notifications_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications_settings" ADD CONSTRAINT "notifications_settings_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
