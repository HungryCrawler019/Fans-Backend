-- CreateEnum
CREATE TYPE "PayoutMode" AS ENUM ('Manual', 'Automatic');

-- CreateTable
CREATE TABLE "payout_schedules" (
    "id" BIGSERIAL NOT NULL,
    "profileId" BIGINT NOT NULL,
    "mode" "PayoutMode" NOT NULL,
    "threshold" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payout_schedules_profileId_idx" ON "payout_schedules"("profileId");

-- CreateIndex
CREATE INDEX "payout_schedules_mode_idx" ON "payout_schedules" USING HASH ("mode");

-- CreateIndex
CREATE INDEX "payout_schedules_threshold_idx" ON "payout_schedules"("threshold");

-- CreateIndex
CREATE INDEX "payout_schedules_updatedAt_idx" ON "payout_schedules"("updatedAt");

-- CreateIndex
CREATE INDEX "payout_schedules_createdAt_idx" ON "payout_schedules"("createdAt");

-- AddForeignKey
ALTER TABLE "payout_schedules" ADD CONSTRAINT "payout_schedules_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
