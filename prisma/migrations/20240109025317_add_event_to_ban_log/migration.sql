/*
  Warnings:

  - Added the required column `event` to the `ban_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ban_logs" ADD COLUMN     "event" TEXT NOT NULL;
