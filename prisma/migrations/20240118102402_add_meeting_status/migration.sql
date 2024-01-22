-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('Pending', 'Accepted', 'Declined', 'Cancelled');

-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "status" "MeetingStatus" NOT NULL DEFAULT 'Pending';
