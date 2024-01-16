-- AlterTable
ALTER TABLE "payout_schedules" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "payout_schedules_id_seq";
