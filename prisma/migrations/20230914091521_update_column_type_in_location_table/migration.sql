/*
  Warnings:

  - You are about to drop the column `location` on the `locations` table. All the data in the column will be lost.
  - Added the required column `address` to the `locations` table without a default value. This is not possible if the table is not empty.

*/

DELETE FROM "locations";
-- AlterTable
ALTER TABLE "locations" DROP COLUMN "location", 
ADD COLUMN     "address" TEXT NOT NULL;
