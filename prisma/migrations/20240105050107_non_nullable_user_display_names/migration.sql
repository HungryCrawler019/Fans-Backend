/*
  Warnings:

  - Made the column `displayName` on table `profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `username` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `displayName` on table `users` required. This step will fail if there are existing NULL values in that column.

*/

-- For anyone with blank display names, set them to their username.
UPDATE "profiles" SET "displayName" = "profileLink" WHERE "displayName" IS NULL OR "displayName" = '';
UPDATE "users" SET "displayName" = "username" WHERE "displayName" IS NULL OR "displayName" = '';

-- For usernames, we assume that all of them in database are already non-null.
-- The migration will simply fail if that's not the case.

-- AlterTable
ALTER TABLE "profiles" ALTER COLUMN "displayName" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL,
ALTER COLUMN "displayName" SET NOT NULL;
