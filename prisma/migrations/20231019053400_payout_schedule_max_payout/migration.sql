/*
  Warnings:

  - Made the column `maxPayout` on table `payout_schedules` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "payout_schedules" ALTER COLUMN "maxPayout" SET NOT NULL;
