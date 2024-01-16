/*
  Warnings:

  - Added the required column `country` to the `payout_payment_methods` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entityType` to the `payout_payment_methods` table without a default value. This is not possible if the table is not empty.
  - Added the required column `usCitizenOrResident` to the `payout_payment_methods` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('Individual', 'Corporation');

-- AlterTable
ALTER TABLE "payout_payment_methods" ADD COLUMN     "country" TEXT NOT NULL,
ADD COLUMN     "entityType" "EntityType" NOT NULL,
ADD COLUMN     "usCitizenOrResident" BOOLEAN NOT NULL;
