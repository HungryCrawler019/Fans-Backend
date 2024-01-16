/*
  Warnings:

  - Added the required column `type` to the `user_settings` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserSettingType" AS ENUM ('VIDEO', 'CAMEO');

-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "type" "UserSettingType" NOT NULL;
