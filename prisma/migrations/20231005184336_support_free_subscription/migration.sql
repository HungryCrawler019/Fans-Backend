-- DropForeignKey
ALTER TABLE "payment_subscriptions" DROP CONSTRAINT "payment_subscriptions_paymentMethodId_fkey";

-- AlterTable
ALTER TABLE "payment_subscriptions" ALTER COLUMN "paymentMethodId" DROP NOT NULL,
ALTER COLUMN "provider" DROP NOT NULL,
ALTER COLUMN "interval" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "payment_subscriptions" ADD CONSTRAINT "payment_subscriptions_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
