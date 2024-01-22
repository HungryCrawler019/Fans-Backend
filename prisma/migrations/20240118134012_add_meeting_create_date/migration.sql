-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "meetings_createdAt_idx" ON "meetings"("createdAt");
