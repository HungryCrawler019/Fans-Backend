-- CreateEnum
CREATE TYPE "CameoContentType" AS ENUM ('Shoutout', 'Advice', 'Acting', 'EighteenPlus', 'EighteenPlusSexual', 'Roast');

-- CreateEnum
CREATE TYPE "CameoVolumeTimeUnit" AS ENUM ('Daily', 'Weekly', 'Monthly');

-- CreateTable
CREATE TABLE "custom_video_settings" (
    "profileId" BIGINT NOT NULL,
    "contentTypes" "CameoContentType"[] DEFAULT ARRAY[]::"CameoContentType"[],
    "customContentType" TEXT,
    "volumeTimeUnit" "CameoVolumeTimeUnit" NOT NULL DEFAULT 'Daily',
    "volumeLimit" INTEGER,
    "fulfillmentTime" INTEGER,
    "description" TEXT,
    "sexualContentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "agreedToTerms" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "custom_video_settings_pkey" PRIMARY KEY ("profileId")
);

-- AddForeignKey
ALTER TABLE "custom_video_settings" ADD CONSTRAINT "custom_video_settings_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION auto_insert_custom_video_settings() RETURNS TRIGGER AS
$BODY$
BEGIN
    INSERT INTO
        "custom_video_settings" ("profileId")
        VALUES(new.id);
        RETURN new;
END;
$BODY$
language plpgsql;

CREATE TRIGGER custom_video_settings_auto_inserter
AFTER INSERT ON "profiles"
FOR EACH ROW
EXECUTE PROCEDURE auto_insert_custom_video_settings();

INSERT INTO "custom_video_settings" ("profileId") SELECT id from "profiles";
