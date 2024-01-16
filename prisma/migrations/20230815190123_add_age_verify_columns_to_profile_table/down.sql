-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "ageVerifyId",
DROP COLUMN "ageVerifyStatus";

-- DropEnum
DROP TYPE "AgeVerifyStatus";

