-- CreateTable
CREATE TABLE "popup_status" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "showNoticeChargeBackDialog" BOOLEAN NOT NULL DEFAULT false,
    "showFairTransactionDialog" BOOLEAN NOT NULL DEFAULT false,
    "showManageSubscriptionDialog" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "popup_status_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "popup_status" ADD CONSTRAINT "popup_status_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
