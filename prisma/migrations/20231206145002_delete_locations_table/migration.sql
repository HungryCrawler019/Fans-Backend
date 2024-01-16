/*
  Warnings:

  - You are about to drop the column `locationId` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the `locations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "locations" DROP CONSTRAINT "locations_profileId_fkey";

-- DropForeignKey
ALTER TABLE "posts" DROP CONSTRAINT "posts_locationId_fkey";

-- AlterTable
ALTER TABLE "posts" DROP COLUMN "locationId",
ADD COLUMN     "location" TEXT;

-- DropTable
DROP TABLE "locations";
