-- AlterTable
ALTER TABLE "bundles" ALTER COLUMN "month" DROP NOT NULL;

-- AlterTable
ALTER TABLE "campaigns" ALTER COLUMN "duration" DROP NOT NULL,
ALTER COLUMN "durationType" DROP NOT NULL;
