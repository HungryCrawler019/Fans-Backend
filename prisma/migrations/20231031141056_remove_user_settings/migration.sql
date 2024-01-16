/*
  Warnings:

  - You are about to drop the `user_settings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "user_settings" DROP CONSTRAINT "user_settings_userId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "settings" JSONB;

-- DropTable
DROP TABLE "user_settings";

-- DropEnum
DROP TYPE "UserSettingType";
