-- AlterTable
ALTER TABLE "popup_status" ADD COLUMN     "loggedIn" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "showFairTransactionDialog" SET DEFAULT false;
