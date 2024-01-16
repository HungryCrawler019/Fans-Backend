-- AlterTable
ALTER TABLE "otp_code" ADD COLUMN     "email" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;
