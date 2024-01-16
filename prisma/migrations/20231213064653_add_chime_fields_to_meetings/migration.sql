-- CreateEnum
CREATE TYPE "RtcStreamCapability" AS ENUM ('SendReceive', 'Send', 'Receive', 'None');

-- DropIndex
DROP INDEX "meetings_chimeMeetingId_key";

-- AlterTable
ALTER TABLE "meeting_users" ADD COLUMN     "audioStreamCapability" "RtcStreamCapability" NOT NULL DEFAULT 'None',
ADD COLUMN     "contentStreamCapability" "RtcStreamCapability" NOT NULL DEFAULT 'None',
ADD COLUMN     "joinToken" TEXT,
ADD COLUMN     "videoStreamCapability" "RtcStreamCapability" NOT NULL DEFAULT 'None';

-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "chimeRequestToken" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "cleanJobId" TEXT,
ADD COLUMN     "prepareJobId" TEXT,
ALTER COLUMN "chimeMeetingId" DROP NOT NULL;
