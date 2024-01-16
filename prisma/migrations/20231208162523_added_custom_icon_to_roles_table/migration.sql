-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "customIcon" TEXT,
ALTER COLUMN "icon" DROP NOT NULL;
