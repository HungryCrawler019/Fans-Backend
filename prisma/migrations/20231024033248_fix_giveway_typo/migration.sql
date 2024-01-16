ALTER TABLE "giveways" RENAME TO "giveaways";
ALTER TABLE "role_giveways" RENAME TO "role_giveaways";
ALTER TABLE "role_giveaways" RENAME COLUMN "givewayId" TO "giveawayId";

-- rename indexes
ALTER INDEX "giveways_postId_key" RENAME TO "giveaways_postId_key";
ALTER INDEX "giveways_prize_idx" RENAME TO "giveaways_prize_idx";
ALTER INDEX "giveways_thumb_idx" RENAME TO "giveaways_thumb_idx";
ALTER INDEX "giveways_endDate_idx" RENAME TO "giveaways_endDate_idx";
ALTER INDEX "giveways_winnerCount_idx" RENAME TO "giveaways_winnerCount_idx";
ALTER INDEX "giveways_updatedAt_idx" RENAME TO "giveaways_updatedAt_idx";
ALTER INDEX "giveways_postId_idx" RENAME TO "giveaways_postId_idx";
ALTER INDEX "role_giveways_roleId_idx" RENAME TO "role_giveaways_roleId_idx";
ALTER INDEX "role_giveways_givewayId_idx" RENAME TO "role_giveaways_giveawayId_idx";

ALTER TABLE "giveaways" RENAME CONSTRAINT "giveways_postId_fkey" TO "giveaways_postId_fkey";
ALTER TABLE "role_giveaways" RENAME CONSTRAINT "role_giveways_roleId_fkey" TO "role_giveaways_roleId_fkey";
ALTER TABLE "role_giveaways" RENAME CONSTRAINT "role_giveways_givewayId_fkey" TO "role_giveaways_giveawayId_fkey";
