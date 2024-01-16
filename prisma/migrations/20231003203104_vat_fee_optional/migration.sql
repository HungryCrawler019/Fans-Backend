-- AlterTable
ALTER TABLE "gem_transactions" ADD COLUMN     "vatFee" INTEGER;

-- AlterTable
ALTER TABLE "payment_subscriptions" ADD COLUMN     "vatFee" INTEGER;
