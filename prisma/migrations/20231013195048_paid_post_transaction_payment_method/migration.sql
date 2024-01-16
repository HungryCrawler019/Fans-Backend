-- AlterTable
ALTER TABLE "paid_post_transactions" ADD COLUMN     "paymentMethodId" BIGINT;

-- AddForeignKey
ALTER TABLE "paid_post_transactions" ADD CONSTRAINT "paid_post_transactions_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
