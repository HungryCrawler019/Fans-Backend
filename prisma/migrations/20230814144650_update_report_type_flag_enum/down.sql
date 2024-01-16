-- CreateEnum
CREATE TYPE "ReportFlag" AS ENUM ('UNDERAGE_USER', 'ILLEGAL_CONTENT', 'OTHER');

-- AlterTable
ALTER TABLE "reports_for_profile" DROP COLUMN "flag",
ADD COLUMN     "flag" "ReportFlag" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "reports_for_post" DROP COLUMN "flag",
ADD COLUMN     "flag" "ReportFlag" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "reports_for_comment" DROP COLUMN "flag",
ADD COLUMN     "flag" "ReportFlag" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "reports_for_user" DROP COLUMN "flag",
ADD COLUMN     "flag" "ReportFlag" NOT NULL;

-- DropEnum
DROP TYPE "PostReportFlag";

-- DropEnum
DROP TYPE "ProfileReportFlag";

