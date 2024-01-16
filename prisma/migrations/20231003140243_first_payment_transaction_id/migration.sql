/*
  Warnings:

  - A unique constraint covering the columns `[firstPaymentTransactionId]` on the table `payment_subscriptions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "payment_subscriptions" ADD COLUMN     "firstPaymentTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payment_subscriptions_firstPaymentTransactionId_key" ON "payment_subscriptions"("firstPaymentTransactionId");
