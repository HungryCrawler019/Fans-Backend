/*
  Warnings:

  - The `flag` column on the `reports_for_comment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `flag` column on the `reports_for_post` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `flag` column on the `reports_for_profile` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `flag` on the `reports_for_user` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PostReportFlag" AS ENUM ('ILLEGAL_CONTENT', 'UNDERAGE_CONTENT', 'GRAPHIC_VOILENCE_OR_GORE', 'HARASSMENT_OR_BULLYING', 'SELF_HARM_OR_SUICIDE_CONTENT', 'NON_CONSENSUAL_CONTENT', 'SPAM_OR_SCAM', 'INFRINGEMENT_OF_MY_COPYRIGHT', 'OTHER');

-- CreateEnum
CREATE TYPE "ProfileReportFlag" AS ENUM ('ILLEGAL_CONTENT', 'UNDERAGE_USER', 'IMPERSONATION_OR_IDENTITY_THEFT', 'PROMOTING_HATE_SPEECH_OR_DISCRIMINATION', 'PROMOTING_DANGEROUS_BEHAVIORS', 'INVOLVED_IN_SPAN_OR_SCAM_ACTIVITIES', 'INFRINGEMENT_OF_MY_COPYRIGHT', 'OTHER');

-- AlterTable
ALTER TABLE "reports_for_comment" DROP COLUMN "flag",
ADD COLUMN     "flag" "PostReportFlag" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "reports_for_post" DROP COLUMN "flag",
ADD COLUMN     "flag" "PostReportFlag" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "reports_for_profile" DROP COLUMN "flag",
ADD COLUMN     "flag" "ProfileReportFlag" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "reports_for_user" DROP COLUMN "flag",
ADD COLUMN     "flag" "ProfileReportFlag" NOT NULL;

-- DropEnum
DROP TYPE "ReportFlag";
