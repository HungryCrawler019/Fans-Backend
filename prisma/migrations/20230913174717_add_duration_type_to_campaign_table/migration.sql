-- CreateEnum
CREATE TYPE "DurationType" AS ENUM ('Hours', 'Days', 'Weeks', 'Months');

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "durationType" "DurationType" NOT NULL DEFAULT 'Days';
