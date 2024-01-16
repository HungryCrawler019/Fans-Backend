/*
  Warnings:

  - The values [PaidPost] on the enum `SpendingType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SpendingType_new" AS ENUM ('Tip', 'Cameo');
ALTER TABLE "gems_spending_logs" ALTER COLUMN "type" TYPE "SpendingType_new" USING ("type"::text::"SpendingType_new");
ALTER TYPE "SpendingType" RENAME TO "SpendingType_old";
ALTER TYPE "SpendingType_new" RENAME TO "SpendingType";
DROP TYPE "SpendingType_old";
COMMIT;

-- CreateTable
CREATE TABLE "paid_post_transactions" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "creatorId" BIGINT NOT NULL,
    "paidPostId" BIGINT NOT NULL,
    "transactionId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "TransactionStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paid_post_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "paid_post_transactions_transactionId_key" ON "paid_post_transactions"("transactionId");

-- CreateIndex
CREATE INDEX "paid_post_transactions_userId_idx" ON "paid_post_transactions"("userId");

-- CreateIndex
CREATE INDEX "paid_post_transactions_creatorId_idx" ON "paid_post_transactions"("creatorId");

-- CreateIndex
CREATE INDEX "paid_post_transactions_paidPostId_idx" ON "paid_post_transactions"("paidPostId");

-- CreateIndex
CREATE INDEX "paid_post_transactions_transactionId_idx" ON "paid_post_transactions" USING HASH ("transactionId");

-- CreateIndex
CREATE INDEX "paid_post_transactions_amount_idx" ON "paid_post_transactions"("amount");

-- CreateIndex
CREATE INDEX "paid_post_transactions_currency_idx" ON "paid_post_transactions" USING HASH ("currency");

-- CreateIndex
CREATE INDEX "paid_post_transactions_status_idx" ON "paid_post_transactions" USING HASH ("status");

-- AddForeignKey
ALTER TABLE "paid_post_transactions" ADD CONSTRAINT "paid_post_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paid_post_transactions" ADD CONSTRAINT "paid_post_transactions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paid_post_transactions" ADD CONSTRAINT "paid_post_transactions_paidPostId_fkey" FOREIGN KEY ("paidPostId") REFERENCES "paid_posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
