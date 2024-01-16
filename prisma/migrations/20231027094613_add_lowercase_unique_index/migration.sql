/*
  Warnings:

  - Made the column `profileLink` on table `profiles` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "profiles_profileLink_key";
CREATE UNIQUE INDEX "profiles_profilelink_key" ON "profiles"(LOWER("profileLink"));

-- AlterTable
ALTER TABLE "profiles" ALTER COLUMN "profileLink" SET NOT NULL;
