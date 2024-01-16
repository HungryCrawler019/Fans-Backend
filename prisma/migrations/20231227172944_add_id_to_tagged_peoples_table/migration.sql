/*
  Warnings:

  - Added the required column `id` to the `tagged_peoples` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tagged_peoples" ADD COLUMN "id" BIGINT,
ADD COLUMN     "pointX" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pointY" INTEGER NOT NULL DEFAULT 0;
