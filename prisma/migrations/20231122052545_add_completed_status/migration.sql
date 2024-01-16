-- AlterTable
ALTER TABLE "uploads" ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false;

UPDATE "uploads" SET "completed" = true;
