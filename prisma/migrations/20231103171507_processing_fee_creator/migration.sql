ALTER TABLE "gems_spending_logs" ADD COLUMN "processingFee" INTEGER;

UPDATE "gems_spending_logs" SET "processingFee" = 0 WHERE "processingFee" IS NULL;

-- AlterTable
ALTER TABLE "gems_spending_logs" ALTER COLUMN "processingFee" SET NOT NULL;

-- CreateIndex
CREATE INDEX "gems_spending_logs_processingFee_idx" ON "gems_spending_logs"("processingFee");
