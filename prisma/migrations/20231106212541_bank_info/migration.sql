-- CreateTable
CREATE TABLE "bank_info" (
    "id" BIGINT NOT NULL,
    "payoutPaymentMethodId" BIGINT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "address1" TEXT NOT NULL,
    "address2" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "bankRoutingNumber" TEXT NOT NULL,
    "bankAccountNumber" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_info_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_info_payoutPaymentMethodId_key" ON "bank_info"("payoutPaymentMethodId");

-- CreateIndex
CREATE INDEX "bank_info_firstName_idx" ON "bank_info"("firstName");

-- CreateIndex
CREATE INDEX "bank_info_lastName_idx" ON "bank_info"("lastName");

-- CreateIndex
CREATE INDEX "bank_info_address1_idx" ON "bank_info"("address1");

-- CreateIndex
CREATE INDEX "bank_info_address2_idx" ON "bank_info"("address2");

-- CreateIndex
CREATE INDEX "bank_info_city_idx" ON "bank_info"("city");

-- CreateIndex
CREATE INDEX "bank_info_state_idx" ON "bank_info"("state");

-- CreateIndex
CREATE INDEX "bank_info_zip_idx" ON "bank_info"("zip");

-- CreateIndex
CREATE INDEX "bank_info_birthDate_idx" ON "bank_info"("birthDate");

-- CreateIndex
CREATE INDEX "bank_info_bankRoutingNumber_idx" ON "bank_info"("bankRoutingNumber");

-- CreateIndex
CREATE INDEX "bank_info_bankAccountNumber_idx" ON "bank_info"("bankAccountNumber");

-- CreateIndex
CREATE INDEX "bank_info_updatedAt_idx" ON "bank_info"("updatedAt");

-- AddForeignKey
ALTER TABLE "bank_info" ADD CONSTRAINT "bank_info_payoutPaymentMethodId_fkey" FOREIGN KEY ("payoutPaymentMethodId") REFERENCES "payout_payment_methods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
