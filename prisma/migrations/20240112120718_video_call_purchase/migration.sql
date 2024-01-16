/*
  Warnings:

  - You are about to alter the column `price` on the `creator_meeting_durations` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Integer`.
  - You are about to alter the column `price` on the `custom_video_durations` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Integer`.

*/
-- AlterTable
ALTER TABLE "creator_meeting_durations" ALTER COLUMN "price" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "custom_video_durations" ALTER COLUMN "price" SET DATA TYPE INTEGER;

-- CreateTable
CREATE TABLE "video_call_purchases" (
    "id" BIGINT NOT NULL,
    "meetingId" BIGINT NOT NULL,
    "fanId" BIGINT NOT NULL,
    "creatorId" BIGINT NOT NULL,
    "paymentMethodId" BIGINT,
    "paymentProfileId" TEXT,
    "transactionId" TEXT,
    "provider" "PaymentProvider",
    "amount" INTEGER NOT NULL,
    "processingFee" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL,
    "vatFee" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "TransactionStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_call_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_call_time_extension_purchases" (
    "id" BIGINT NOT NULL,
    "meetingId" BIGINT NOT NULL,
    "additionalTime" INTEGER NOT NULL,
    "paymentMethodId" BIGINT,
    "paymentProfileId" TEXT,
    "transactionId" TEXT,
    "provider" "PaymentProvider",
    "amount" INTEGER NOT NULL,
    "processingFee" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL,
    "vatFee" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "TransactionStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_call_time_extension_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_call_purchases_transactionId_key" ON "video_call_purchases"("transactionId");

-- CreateIndex
CREATE INDEX "video_call_purchases_meetingId_idx" ON "video_call_purchases"("meetingId");

-- CreateIndex
CREATE INDEX "video_call_purchases_fanId_idx" ON "video_call_purchases"("fanId");

-- CreateIndex
CREATE INDEX "video_call_purchases_creatorId_idx" ON "video_call_purchases"("creatorId");

-- CreateIndex
CREATE INDEX "video_call_purchases_transactionId_idx" ON "video_call_purchases" USING HASH ("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "video_call_time_extension_purchases_transactionId_key" ON "video_call_time_extension_purchases"("transactionId");

-- CreateIndex
CREATE INDEX "video_call_time_extension_purchases_meetingId_idx" ON "video_call_time_extension_purchases"("meetingId");

-- CreateIndex
CREATE INDEX "video_call_time_extension_purchases_transactionId_idx" ON "video_call_time_extension_purchases" USING HASH ("transactionId");

-- AddForeignKey
ALTER TABLE "video_call_purchases" ADD CONSTRAINT "video_call_purchases_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_call_purchases" ADD CONSTRAINT "video_call_purchases_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_call_purchases" ADD CONSTRAINT "video_call_purchases_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_call_purchases" ADD CONSTRAINT "video_call_purchases_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_call_time_extension_purchases" ADD CONSTRAINT "video_call_time_extension_purchases_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_call_time_extension_purchases" ADD CONSTRAINT "video_call_time_extension_purchases_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
