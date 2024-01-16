-- AlterTable
ALTER TABLE "notifications_settings" ALTER COLUMN "newSubscriberCreatorEmail" SET DEFAULT true,
ALTER COLUMN "tipCreatorEmail" SET DEFAULT true,
ALTER COLUMN "paidPostCreatorEmail" SET DEFAULT true,
ALTER COLUMN "messageCreatorEmail" SET DEFAULT true,
ALTER COLUMN "messageFanEmail" SET DEFAULT true,
ALTER COLUMN "transactionFanEmail" SET DEFAULT true,
ALTER COLUMN "newPostFanEmail" SET DEFAULT true,
ALTER COLUMN "newSubscriberCreatorInApp" SET DEFAULT true,
ALTER COLUMN "tipCreatorInApp" SET DEFAULT true,
ALTER COLUMN "paidPostCreatorInApp" SET DEFAULT true,
ALTER COLUMN "messageCreatorInApp" SET DEFAULT true,
ALTER COLUMN "messageFanInApp" SET DEFAULT true,
ALTER COLUMN "transactionFanInApp" SET DEFAULT true;
