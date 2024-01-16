-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('Creator', 'Fan');

-- CreateEnum
CREATE TYPE "XPActionType" AS ENUM ('Multiple', 'Add');

-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('Tier', 'Flat');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('NEW', 'EXISTING', 'BOTH');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('Free_Trial', 'Discount');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('Video', 'Photo', 'Text', 'Audio', 'Fundraiser', 'Poll');

-- CreateEnum
CREATE TYPE "UploadType" AS ENUM ('Video', 'Image', 'Audio');

-- CreateEnum
CREATE TYPE "GenderType" AS ENUM ('Male', 'Female');

-- CreateEnum
CREATE TYPE "LanguageType" AS ENUM ('English', 'Russian');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'ACCEPTED', 'IGNORED');

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'SHADOW_BANNED');

-- CreateEnum
CREATE TYPE "ReportFlag" AS ENUM ('UNDERAGE_USER', 'ILLEGAL_CONTENT', 'OTHER');

-- CreateEnum
CREATE TYPE "SpendingType" AS ENUM ('Tip', 'Cameo');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('Stripe', 'PayPal', 'AuthorizeNet');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('Initialized', 'Submitted', 'Pending', 'Successful', 'Failed', 'Refunded', 'Disputed', 'Reversed', 'Cancelled');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('Initialized', 'Submitted', 'Pending', 'Active', 'Paused', 'Terminated', 'Failed', 'Refunded', 'Disputed', 'Reversed', 'Cancelled');

-- CreateEnum
CREATE TYPE "MessageChannelType" AS ENUM ('DIRECT');

-- CreateTable
CREATE TABLE "users" (
    "id" BIGINT NOT NULL,
    "username" TEXT NOT NULL,
    "gender" "GenderType",
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phonenumber" TEXT,
    "birthdate" TIMESTAMP(3),
    "avatar" TEXT,
    "country" TEXT,
    "language" "LanguageType" NOT NULL DEFAULT 'English',
    "type" "UserType" NOT NULL DEFAULT 'Fan',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isModerator" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balances" (
    "id" BIGINT NOT NULL,
    "profileId" BIGINT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_subscriptions" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "subscriptionId" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gems_spending_logs" (
    "id" BIGINT NOT NULL,
    "spenderId" BIGINT NOT NULL,
    "creatorId" BIGINT,
    "type" "SpendingType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "platformFee" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gems_spending_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gems_balances" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gems_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gem_transactions" (
    "id" BIGINT NOT NULL,
    "balanceId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "transactionId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "processingFee" DOUBLE PRECISION NOT NULL,
    "platformFee" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "TransactionStatus" NOT NULL,
    "error" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gem_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_webhook_events" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "token" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_subscriptions" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "creatorId" BIGINT NOT NULL,
    "paymentMethodId" BIGINT NOT NULL,
    "subscriptionId" BIGINT,
    "tierId" BIGINT,
    "bundleId" BIGINT,
    "campaignId" BIGINT,
    "transactionId" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "interval" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "processingFee" DOUBLE PRECISION NOT NULL,
    "platformFee" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "SubscriptionStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_code" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "code" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otp_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "displayName" TEXT,
    "profileLink" TEXT,
    "bio" TEXT NOT NULL,
    "avatar" TEXT,
    "cover" TEXT[],
    "supportNsfw" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionType" "SubscriptionType" NOT NULL DEFAULT 'Flat',
    "migrationLink" TEXT,
    "location" TEXT,
    "birthday" TIMESTAMP(3),
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "billingPaused" BOOLEAN,
    "explicitCommentFilter" BOOLEAN,
    "hideComments" BOOLEAN,
    "hideLikes" BOOLEAN,
    "hideTips" BOOLEAN,
    "isPremium" BOOLEAN,
    "showProfile" BOOLEAN,
    "uploadedVideoDuration" INTEGER NOT NULL DEFAULT 0,
    "watermark" BOOLEAN,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_link" (
    "id" BIGINT NOT NULL,
    "profileId" BIGINT NOT NULL,
    "provider" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" BIGINT NOT NULL,
    "profileId" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundles" (
    "id" BIGINT NOT NULL,
    "subscriptionId" BIGINT,
    "title" TEXT,
    "month" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL,
    "limit" INTEGER NOT NULL DEFAULT -1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiers" (
    "id" BIGINT NOT NULL,
    "profileId" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cover" TEXT NOT NULL,
    "perks" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" BIGINT NOT NULL,
    "subscriptionId" BIGINT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "limit" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL,
    "type" "PromotionType" NOT NULL DEFAULT 'Free_Trial',
    "applicable" "CampaignType" NOT NULL DEFAULT 'NEW',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_levels" (
    "id" BIGINT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT,
    "userId" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_actions" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "xp" INTEGER NOT NULL,
    "type" "XPActionType" NOT NULL DEFAULT 'Add',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xp_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_logs" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "action" "XPActionType" NOT NULL,
    "amount" DOUBLE PRECISION DEFAULT 1,
    "xp" INTEGER NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "verifiedUserId" BIGINT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xp_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" BIGINT NOT NULL,
    "profileId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "profileId" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_categories" (
    "id" BIGINT NOT NULL,
    "postId" BIGINT NOT NULL,
    "categoryId" BIGINT NOT NULL,

    CONSTRAINT "post_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" BIGINT NOT NULL,
    "profileId" BIGINT NOT NULL,
    "title" TEXT,
    "type" "PostType" NOT NULL DEFAULT 'Text',
    "caption" TEXT NOT NULL,
    "thumb" TEXT,
    "resource" JSONB NOT NULL,
    "advanced" JSONB,
    "locationId" BIGINT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "bookmarkCount" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "episodeNumber" INTEGER,
    "isPrivate" BOOLEAN DEFAULT false,
    "isNoiseReduction" BOOLEAN DEFAULT false,
    "isAudioLeveling" BOOLEAN DEFAULT false,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" BIGINT NOT NULL,
    "profileId" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "location" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paid_posts" (
    "id" BIGINT NOT NULL,
    "postId" BIGINT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "thumb" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paid_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fundraisers" (
    "id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "thumb" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "isXpAdd" BOOLEAN NOT NULL DEFAULT true,
    "postId" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fundraisers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "giveways" (
    "id" BIGINT NOT NULL,
    "prize" TEXT NOT NULL,
    "thumb" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "winnerCount" INTEGER NOT NULL,
    "postId" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "giveways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polls" (
    "id" BIGINT NOT NULL,
    "question" TEXT NOT NULL,
    "caption" TEXT,
    "answers" JSONB NOT NULL,
    "thumb" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "postId" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" BIGINT NOT NULL,
    "postId" BIGINT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_categories" (
    "id" BIGINT NOT NULL,
    "roleId" BIGINT NOT NULL,
    "categoryId" BIGINT NOT NULL,

    CONSTRAINT "role_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_posts" (
    "id" BIGINT NOT NULL,
    "roleId" BIGINT NOT NULL,
    "postId" BIGINT NOT NULL,

    CONSTRAINT "role_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_giveways" (
    "id" BIGINT NOT NULL,
    "roleId" BIGINT NOT NULL,
    "givewayId" BIGINT NOT NULL,

    CONSTRAINT "role_giveways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_polls" (
    "id" BIGINT NOT NULL,
    "roleId" BIGINT NOT NULL,
    "pollId" BIGINT NOT NULL,

    CONSTRAINT "role_polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploads" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "type" "UploadType" NOT NULL,
    "url" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlists" (
    "id" BIGINT NOT NULL,
    "profileId" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumb" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlist_posts" (
    "id" BIGINT NOT NULL,
    "playlistId" BIGINT NOT NULL,
    "postId" BIGINT NOT NULL,

    CONSTRAINT "playlist_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlist_uploads" (
    "id" BIGINT NOT NULL,
    "playlistId" BIGINT NOT NULL,
    "uploadId" BIGINT NOT NULL,

    CONSTRAINT "playlist_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports_for_profile" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "profileId" BIGINT NOT NULL,
    "flag" "ReportFlag" NOT NULL DEFAULT 'OTHER',
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_for_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports_for_post" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "postId" BIGINT NOT NULL,
    "flag" "ReportFlag" NOT NULL DEFAULT 'OTHER',
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_for_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_list" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "userlist_user" (
    "userlistId" BIGINT NOT NULL,
    "profileId" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "comments" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "postId" BIGINT NOT NULL,
    "parentCommentId" BIGINT,
    "status" "CommentStatus" NOT NULL DEFAULT 'VISIBLE',
    "content" TEXT NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports_for_comment" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "commentId" BIGINT NOT NULL,
    "flag" "ReportFlag" NOT NULL DEFAULT 'OTHER',
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_for_comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "likes" (
    "userId" BIGINT NOT NULL,
    "commentId" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "oauth2_linked_accounts" (
    "id" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "provider" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,

    CONSTRAINT "oauth2_linked_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_channels" (
    "id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "channelType" "MessageChannelType" NOT NULL,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_channel_participants" (
    "channelId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "conversationMuted" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "messages" (
    "id" BIGINT NOT NULL,
    "channelId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "messageType" INTEGER NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" BIGINT NOT NULL,
    "profileId" BIGINT NOT NULL,
    "isHighlight" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_viewers" (
    "creatorId" BIGINT NOT NULL,
    "viewerId" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "story_medias" (
    "storyId" BIGINT NOT NULL,
    "uploadId" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "limit_payment_users" (
    "creatorId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "profile_previews" (
    "id" BIGINT NOT NULL,
    "profileId" BIGINT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "profile_previews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports_for_user" (
    "id" BIGINT NOT NULL,
    "creatorId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "flag" "ReportFlag" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_for_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tagged_peoples" (
    "postId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "highlights" (
    "id" BIGINT NOT NULL,
    "profileId" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "cover" TEXT NOT NULL,
    "resources" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "highlights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "userId" BIGINT NOT NULL,
    "postId" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_type_idx" ON "users" USING HASH ("type");

-- CreateIndex
CREATE INDEX "users_isAdmin_idx" ON "users" USING HASH ("isAdmin");

-- CreateIndex
CREATE INDEX "users_isModerator_idx" ON "users" USING HASH ("isModerator");

-- CreateIndex
CREATE INDEX "users_verifiedAt_idx" ON "users"("verifiedAt");

-- CreateIndex
CREATE INDEX "users_updatedAt_idx" ON "users"("updatedAt");

-- CreateIndex
CREATE INDEX "balances_profileId_idx" ON "balances"("profileId");

-- CreateIndex
CREATE INDEX "balances_amount_idx" ON "balances"("amount");

-- CreateIndex
CREATE INDEX "balances_currency_idx" ON "balances"("currency");

-- CreateIndex
CREATE INDEX "balances_updatedAt_idx" ON "balances"("updatedAt");

-- CreateIndex
CREATE INDEX "gems_spending_logs_spenderId_idx" ON "gems_spending_logs"("spenderId");

-- CreateIndex
CREATE INDEX "gems_spending_logs_creatorId_idx" ON "gems_spending_logs"("creatorId");

-- CreateIndex
CREATE INDEX "gems_spending_logs_type_idx" ON "gems_spending_logs" USING HASH ("type");

-- CreateIndex
CREATE INDEX "gems_spending_logs_amount_idx" ON "gems_spending_logs"("amount");

-- CreateIndex
CREATE INDEX "gems_spending_logs_platformFee_idx" ON "gems_spending_logs"("platformFee");

-- CreateIndex
CREATE INDEX "gems_spending_logs_currency_idx" ON "gems_spending_logs" USING HASH ("currency");

-- CreateIndex
CREATE INDEX "gems_spending_logs_updatedAt_idx" ON "gems_spending_logs"("updatedAt");

-- CreateIndex
CREATE INDEX "gems_balances_userId_idx" ON "gems_balances"("userId");

-- CreateIndex
CREATE INDEX "gems_balances_amount_idx" ON "gems_balances"("amount");

-- CreateIndex
CREATE INDEX "gems_balances_currency_idx" ON "gems_balances" USING HASH ("currency");

-- CreateIndex
CREATE INDEX "gems_balances_updatedAt_idx" ON "gems_balances"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "gem_transactions_transactionId_key" ON "gem_transactions"("transactionId");

-- CreateIndex
CREATE INDEX "gem_transactions_balanceId_idx" ON "gem_transactions"("balanceId");

-- CreateIndex
CREATE INDEX "gem_transactions_userId_idx" ON "gem_transactions"("userId");

-- CreateIndex
CREATE INDEX "gem_transactions_provider_idx" ON "gem_transactions" USING HASH ("provider");

-- CreateIndex
CREATE INDEX "gem_transactions_transactionId_idx" ON "gem_transactions" USING HASH ("transactionId");

-- CreateIndex
CREATE INDEX "gem_transactions_amount_idx" ON "gem_transactions"("amount");

-- CreateIndex
CREATE INDEX "gem_transactions_processingFee_idx" ON "gem_transactions"("processingFee");

-- CreateIndex
CREATE INDEX "gem_transactions_platformFee_idx" ON "gem_transactions"("platformFee");

-- CreateIndex
CREATE INDEX "gem_transactions_currency_idx" ON "gem_transactions" USING HASH ("currency");

-- CreateIndex
CREATE INDEX "gem_transactions_status_idx" ON "gem_transactions" USING HASH ("status");

-- CreateIndex
CREATE INDEX "gem_transactions_updatedAt_idx" ON "gem_transactions"("updatedAt");

-- CreateIndex
CREATE INDEX "processed_webhook_events_createdAt_idx" ON "processed_webhook_events"("createdAt");

-- CreateIndex
CREATE INDEX "payment_methods_userId_idx" ON "payment_methods"("userId");

-- CreateIndex
CREATE INDEX "payment_methods_provider_idx" ON "payment_methods" USING HASH ("provider");

-- CreateIndex
CREATE INDEX "payment_methods_token_idx" ON "payment_methods" USING HASH ("token");

-- CreateIndex
CREATE INDEX "payment_methods_updatedAt_idx" ON "payment_methods"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_subscriptions_transactionId_key" ON "payment_subscriptions"("transactionId");

-- CreateIndex
CREATE INDEX "payment_subscriptions_userId_idx" ON "payment_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "payment_subscriptions_paymentMethodId_idx" ON "payment_subscriptions"("paymentMethodId");

-- CreateIndex
CREATE INDEX "payment_subscriptions_subscriptionId_idx" ON "payment_subscriptions"("subscriptionId");

-- CreateIndex
CREATE INDEX "payment_subscriptions_tierId_idx" ON "payment_subscriptions"("tierId");

-- CreateIndex
CREATE INDEX "payment_subscriptions_bundleId_idx" ON "payment_subscriptions"("bundleId");

-- CreateIndex
CREATE INDEX "payment_subscriptions_campaignId_idx" ON "payment_subscriptions"("campaignId");

-- CreateIndex
CREATE INDEX "payment_subscriptions_provider_idx" ON "payment_subscriptions" USING HASH ("provider");

-- CreateIndex
CREATE INDEX "payment_subscriptions_transactionId_idx" ON "payment_subscriptions" USING HASH ("transactionId");

-- CreateIndex
CREATE INDEX "payment_subscriptions_amount_idx" ON "payment_subscriptions"("amount");

-- CreateIndex
CREATE INDEX "payment_subscriptions_processingFee_idx" ON "payment_subscriptions"("processingFee");

-- CreateIndex
CREATE INDEX "payment_subscriptions_platformFee_idx" ON "payment_subscriptions"("platformFee");

-- CreateIndex
CREATE INDEX "payment_subscriptions_currency_idx" ON "payment_subscriptions" USING HASH ("currency");

-- CreateIndex
CREATE INDEX "payment_subscriptions_status_idx" ON "payment_subscriptions" USING HASH ("status");

-- CreateIndex
CREATE INDEX "payment_subscriptions_updatedAt_idx" ON "payment_subscriptions"("updatedAt");

-- CreateIndex
CREATE INDEX "otp_code_code_idx" ON "otp_code" USING HASH ("code");

-- CreateIndex
CREATE INDEX "otp_code_userId_idx" ON "otp_code"("userId");

-- CreateIndex
CREATE INDEX "otp_code_updatedAt_idx" ON "otp_code"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_profileLink_key" ON "profiles"("profileLink");

-- CreateIndex
CREATE INDEX "profiles_displayName_idx" ON "profiles"("displayName");

-- CreateIndex
CREATE INDEX "profiles_profileLink_idx" ON "profiles"("profileLink");

-- CreateIndex
CREATE INDEX "profiles_supportNsfw_idx" ON "profiles" USING HASH ("supportNsfw");

-- CreateIndex
CREATE INDEX "profiles_subscriptionType_idx" ON "profiles" USING HASH ("subscriptionType");

-- CreateIndex
CREATE INDEX "profiles_migrationLink_idx" ON "profiles"("migrationLink");

-- CreateIndex
CREATE INDEX "profiles_location_idx" ON "profiles"("location");

-- CreateIndex
CREATE INDEX "profiles_birthday_idx" ON "profiles"("birthday");

-- CreateIndex
CREATE INDEX "profiles_isEnabled_idx" ON "profiles" USING HASH ("isEnabled");

-- CreateIndex
CREATE INDEX "profiles_likeCount_idx" ON "profiles"("likeCount");

-- CreateIndex
CREATE INDEX "profiles_commentCount_idx" ON "profiles"("commentCount");

-- CreateIndex
CREATE INDEX "profiles_updatedAt_idx" ON "profiles"("updatedAt");

-- CreateIndex
CREATE INDEX "social_link_profileId_idx" ON "social_link"("profileId");

-- CreateIndex
CREATE INDEX "social_link_provider_idx" ON "social_link" USING HASH ("provider");

-- CreateIndex
CREATE INDEX "social_link_url_idx" ON "social_link"("url");

-- CreateIndex
CREATE INDEX "social_link_updatedAt_idx" ON "social_link"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "social_link_profileId_provider_key" ON "social_link"("profileId", "provider");

-- CreateIndex
CREATE INDEX "subscriptions_profileId_idx" ON "subscriptions"("profileId");

-- CreateIndex
CREATE INDEX "subscriptions_title_idx" ON "subscriptions"("title");

-- CreateIndex
CREATE INDEX "subscriptions_currency_idx" ON "subscriptions" USING HASH ("currency");

-- CreateIndex
CREATE INDEX "subscriptions_price_idx" ON "subscriptions"("price");

-- CreateIndex
CREATE INDEX "subscriptions_updatedAt_idx" ON "subscriptions"("updatedAt");

-- CreateIndex
CREATE INDEX "bundles_subscriptionId_idx" ON "bundles"("subscriptionId");

-- CreateIndex
CREATE INDEX "bundles_title_idx" ON "bundles"("title");

-- CreateIndex
CREATE INDEX "bundles_month_idx" ON "bundles"("month");

-- CreateIndex
CREATE INDEX "bundles_discount_idx" ON "bundles"("discount");

-- CreateIndex
CREATE INDEX "bundles_limit_idx" ON "bundles"("limit");

-- CreateIndex
CREATE INDEX "bundles_updatedAt_idx" ON "bundles"("updatedAt");

-- CreateIndex
CREATE INDEX "tiers_profileId_idx" ON "tiers"("profileId");

-- CreateIndex
CREATE INDEX "tiers_title_idx" ON "tiers"("title");

-- CreateIndex
CREATE INDEX "tiers_price_idx" ON "tiers"("price");

-- CreateIndex
CREATE INDEX "tiers_currency_idx" ON "tiers" USING HASH ("currency");

-- CreateIndex
CREATE INDEX "tiers_description_idx" ON "tiers"("description");

-- CreateIndex
CREATE INDEX "tiers_cover_idx" ON "tiers"("cover");

-- CreateIndex
CREATE INDEX "tiers_updatedAt_idx" ON "tiers"("updatedAt");

-- CreateIndex
CREATE INDEX "campaigns_subscriptionId_idx" ON "campaigns"("subscriptionId");

-- CreateIndex
CREATE INDEX "campaigns_startDate_idx" ON "campaigns"("startDate");

-- CreateIndex
CREATE INDEX "campaigns_endDate_idx" ON "campaigns"("endDate");

-- CreateIndex
CREATE INDEX "campaigns_duration_idx" ON "campaigns"("duration");

-- CreateIndex
CREATE INDEX "campaigns_limit_idx" ON "campaigns"("limit");

-- CreateIndex
CREATE INDEX "campaigns_discount_idx" ON "campaigns"("discount");

-- CreateIndex
CREATE INDEX "campaigns_type_idx" ON "campaigns" USING HASH ("type");

-- CreateIndex
CREATE INDEX "campaigns_applicable_idx" ON "campaigns" USING HASH ("applicable");

-- CreateIndex
CREATE INDEX "campaigns_updatedAt_idx" ON "campaigns"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_levels_userId_key" ON "user_levels"("userId");

-- CreateIndex
CREATE INDEX "user_levels_userId_idx" ON "user_levels"("userId");

-- CreateIndex
CREATE INDEX "user_levels_updatedAt_idx" ON "user_levels"("updatedAt");

-- CreateIndex
CREATE INDEX "user_levels_xp_idx" ON "user_levels"("xp");

-- CreateIndex
CREATE INDEX "user_levels_level_idx" ON "user_levels"("level");

-- CreateIndex
CREATE UNIQUE INDEX "xp_actions_action_key" ON "xp_actions"("action");

-- CreateIndex
CREATE INDEX "xp_actions_action_idx" ON "xp_actions" USING HASH ("action");

-- CreateIndex
CREATE INDEX "xp_actions_xp_idx" ON "xp_actions"("xp");

-- CreateIndex
CREATE INDEX "xp_actions_type_idx" ON "xp_actions" USING HASH ("type");

-- CreateIndex
CREATE INDEX "xp_actions_updatedAt_idx" ON "xp_actions"("updatedAt");

-- CreateIndex
CREATE INDEX "xp_logs_userId_idx" ON "xp_logs"("userId");

-- CreateIndex
CREATE INDEX "xp_logs_action_idx" ON "xp_logs" USING HASH ("action");

-- CreateIndex
CREATE INDEX "xp_logs_amount_idx" ON "xp_logs"("amount");

-- CreateIndex
CREATE INDEX "xp_logs_xp_idx" ON "xp_logs"("xp");

-- CreateIndex
CREATE INDEX "xp_logs_verifiedAt_idx" ON "xp_logs"("verifiedAt");

-- CreateIndex
CREATE INDEX "xp_logs_verifiedUserId_idx" ON "xp_logs"("verifiedUserId");

-- CreateIndex
CREATE INDEX "xp_logs_updatedAt_idx" ON "xp_logs"("updatedAt");

-- CreateIndex
CREATE INDEX "roles_profileId_idx" ON "roles"("profileId");

-- CreateIndex
CREATE INDEX "roles_name_idx" ON "roles"("name");

-- CreateIndex
CREATE INDEX "roles_color_idx" ON "roles"("color");

-- CreateIndex
CREATE INDEX "roles_icon_idx" ON "roles"("icon");

-- CreateIndex
CREATE INDEX "roles_level_idx" ON "roles"("level");

-- CreateIndex
CREATE INDEX "roles_updatedAt_idx" ON "roles"("updatedAt");

-- CreateIndex
CREATE INDEX "categories_name_idx" ON "categories"("name");

-- CreateIndex
CREATE INDEX "categories_profileId_idx" ON "categories"("profileId");

-- CreateIndex
CREATE INDEX "categories_updatedAt_idx" ON "categories"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_profileId_key" ON "categories"("name", "profileId");

-- CreateIndex
CREATE INDEX "post_categories_postId_idx" ON "post_categories"("postId");

-- CreateIndex
CREATE INDEX "post_categories_categoryId_idx" ON "post_categories"("categoryId");

-- CreateIndex
CREATE INDEX "posts_profileId_idx" ON "posts"("profileId");

-- CreateIndex
CREATE INDEX "posts_title_idx" ON "posts"("title");

-- CreateIndex
CREATE INDEX "posts_type_idx" ON "posts" USING HASH ("type");

-- CreateIndex
CREATE INDEX "posts_thumb_idx" ON "posts"("thumb");

-- CreateIndex
CREATE INDEX "posts_updatedAt_idx" ON "posts"("updatedAt");

-- CreateIndex
CREATE INDEX "posts_isArchived_idx" ON "posts" USING HASH ("isArchived");

-- CreateIndex
CREATE INDEX "posts_isHidden_idx" ON "posts" USING HASH ("isHidden");

-- CreateIndex
CREATE INDEX "posts_commentCount_idx" ON "posts"("commentCount");

-- CreateIndex
CREATE INDEX "posts_likeCount_idx" ON "posts"("likeCount");

-- CreateIndex
CREATE INDEX "locations_profileId_idx" ON "locations"("profileId");

-- CreateIndex
CREATE INDEX "locations_title_idx" ON "locations"("title");

-- CreateIndex
CREATE INDEX "locations_updatedAt_idx" ON "locations"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "paid_posts_postId_key" ON "paid_posts"("postId");

-- CreateIndex
CREATE INDEX "paid_posts_postId_idx" ON "paid_posts"("postId");

-- CreateIndex
CREATE INDEX "paid_posts_price_idx" ON "paid_posts"("price");

-- CreateIndex
CREATE INDEX "paid_posts_currency_idx" ON "paid_posts" USING HASH ("currency");

-- CreateIndex
CREATE INDEX "paid_posts_updatedAt_idx" ON "paid_posts"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "fundraisers_postId_key" ON "fundraisers"("postId");

-- CreateIndex
CREATE INDEX "fundraisers_title_idx" ON "fundraisers"("title");

-- CreateIndex
CREATE INDEX "fundraisers_thumb_idx" ON "fundraisers"("thumb");

-- CreateIndex
CREATE INDEX "fundraisers_price_idx" ON "fundraisers"("price");

-- CreateIndex
CREATE INDEX "fundraisers_currency_idx" ON "fundraisers" USING HASH ("currency");

-- CreateIndex
CREATE INDEX "fundraisers_startDate_idx" ON "fundraisers"("startDate");

-- CreateIndex
CREATE INDEX "fundraisers_endDate_idx" ON "fundraisers"("endDate");

-- CreateIndex
CREATE INDEX "fundraisers_timezone_idx" ON "fundraisers"("timezone");

-- CreateIndex
CREATE INDEX "fundraisers_isXpAdd_idx" ON "fundraisers" USING HASH ("isXpAdd");

-- CreateIndex
CREATE INDEX "fundraisers_updatedAt_idx" ON "fundraisers"("updatedAt");

-- CreateIndex
CREATE INDEX "fundraisers_postId_idx" ON "fundraisers"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "giveways_postId_key" ON "giveways"("postId");

-- CreateIndex
CREATE INDEX "giveways_prize_idx" ON "giveways"("prize");

-- CreateIndex
CREATE INDEX "giveways_thumb_idx" ON "giveways"("thumb");

-- CreateIndex
CREATE INDEX "giveways_startDate_idx" ON "giveways"("startDate");

-- CreateIndex
CREATE INDEX "giveways_endDate_idx" ON "giveways"("endDate");

-- CreateIndex
CREATE INDEX "giveways_timezone_idx" ON "giveways"("timezone");

-- CreateIndex
CREATE INDEX "giveways_winnerCount_idx" ON "giveways"("winnerCount");

-- CreateIndex
CREATE INDEX "giveways_updatedAt_idx" ON "giveways"("updatedAt");

-- CreateIndex
CREATE INDEX "giveways_postId_idx" ON "giveways"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "polls_postId_key" ON "polls"("postId");

-- CreateIndex
CREATE INDEX "polls_question_idx" ON "polls"("question");

-- CreateIndex
CREATE INDEX "polls_caption_idx" ON "polls"("caption");

-- CreateIndex
CREATE INDEX "polls_startDate_idx" ON "polls"("startDate");

-- CreateIndex
CREATE INDEX "polls_endDate_idx" ON "polls"("endDate");

-- CreateIndex
CREATE INDEX "polls_timezone_idx" ON "polls"("timezone");

-- CreateIndex
CREATE INDEX "polls_updatedAt_idx" ON "polls"("updatedAt");

-- CreateIndex
CREATE INDEX "polls_postId_idx" ON "polls"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_postId_key" ON "schedules"("postId");

-- CreateIndex
CREATE INDEX "schedules_postId_idx" ON "schedules"("postId");

-- CreateIndex
CREATE INDEX "schedules_startDate_idx" ON "schedules"("startDate");

-- CreateIndex
CREATE INDEX "schedules_endDate_idx" ON "schedules"("endDate");

-- CreateIndex
CREATE INDEX "schedules_timezone_idx" ON "schedules"("timezone");

-- CreateIndex
CREATE INDEX "schedules_updatedAt_idx" ON "schedules"("updatedAt");

-- CreateIndex
CREATE INDEX "role_categories_roleId_idx" ON "role_categories"("roleId");

-- CreateIndex
CREATE INDEX "role_categories_categoryId_idx" ON "role_categories"("categoryId");

-- CreateIndex
CREATE INDEX "role_posts_roleId_idx" ON "role_posts"("roleId");

-- CreateIndex
CREATE INDEX "role_posts_postId_idx" ON "role_posts"("postId");

-- CreateIndex
CREATE INDEX "role_giveways_roleId_idx" ON "role_giveways"("roleId");

-- CreateIndex
CREATE INDEX "role_giveways_givewayId_idx" ON "role_giveways"("givewayId");

-- CreateIndex
CREATE INDEX "role_polls_roleId_idx" ON "role_polls"("roleId");

-- CreateIndex
CREATE INDEX "role_polls_pollId_idx" ON "role_polls"("pollId");

-- CreateIndex
CREATE INDEX "uploads_userId_idx" ON "uploads"("userId");

-- CreateIndex
CREATE INDEX "uploads_type_idx" ON "uploads" USING HASH ("type");

-- CreateIndex
CREATE INDEX "uploads_url_idx" ON "uploads"("url");

-- CreateIndex
CREATE INDEX "uploads_updatedAt_idx" ON "uploads"("updatedAt");

-- CreateIndex
CREATE INDEX "playlists_profileId_idx" ON "playlists"("profileId");

-- CreateIndex
CREATE INDEX "playlists_title_idx" ON "playlists"("title");

-- CreateIndex
CREATE INDEX "playlists_description_idx" ON "playlists"("description");

-- CreateIndex
CREATE INDEX "playlists_isPrivate_idx" ON "playlists" USING HASH ("isPrivate");

-- CreateIndex
CREATE INDEX "playlists_updatedAt_idx" ON "playlists"("updatedAt");

-- CreateIndex
CREATE INDEX "playlist_posts_playlistId_idx" ON "playlist_posts"("playlistId");

-- CreateIndex
CREATE INDEX "playlist_posts_postId_idx" ON "playlist_posts"("postId");

-- CreateIndex
CREATE INDEX "playlist_uploads_playlistId_idx" ON "playlist_uploads"("playlistId");

-- CreateIndex
CREATE INDEX "playlist_uploads_uploadId_idx" ON "playlist_uploads"("uploadId");

-- CreateIndex
CREATE INDEX "reports_for_profile_userId_idx" ON "reports_for_profile"("userId");

-- CreateIndex
CREATE INDEX "reports_for_profile_profileId_idx" ON "reports_for_profile"("profileId");

-- CreateIndex
CREATE INDEX "reports_for_profile_status_idx" ON "reports_for_profile" USING HASH ("status");

-- CreateIndex
CREATE INDEX "reports_for_profile_reason_idx" ON "reports_for_profile"("reason");

-- CreateIndex
CREATE INDEX "reports_for_profile_updatedAt_idx" ON "reports_for_profile"("updatedAt");

-- CreateIndex
CREATE INDEX "reports_for_post_userId_idx" ON "reports_for_post"("userId");

-- CreateIndex
CREATE INDEX "reports_for_post_postId_idx" ON "reports_for_post"("postId");

-- CreateIndex
CREATE INDEX "reports_for_post_status_idx" ON "reports_for_post" USING HASH ("status");

-- CreateIndex
CREATE INDEX "reports_for_post_reason_idx" ON "reports_for_post"("reason");

-- CreateIndex
CREATE INDEX "reports_for_post_updatedAt_idx" ON "reports_for_post"("updatedAt");

-- CreateIndex
CREATE INDEX "user_list_userId_idx" ON "user_list"("userId");

-- CreateIndex
CREATE INDEX "user_list_title_idx" ON "user_list"("title");

-- CreateIndex
CREATE INDEX "user_list_updatedAt_idx" ON "user_list"("updatedAt");

-- CreateIndex
CREATE INDEX "userlist_user_userlistId_idx" ON "userlist_user"("userlistId");

-- CreateIndex
CREATE INDEX "userlist_user_profileId_idx" ON "userlist_user"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "userlist_user_userlistId_profileId_key" ON "userlist_user"("userlistId", "profileId");

-- CreateIndex
CREATE INDEX "comments_userId_idx" ON "comments"("userId");

-- CreateIndex
CREATE INDEX "comments_postId_idx" ON "comments"("postId");

-- CreateIndex
CREATE INDEX "comments_parentCommentId_idx" ON "comments"("parentCommentId");

-- CreateIndex
CREATE INDEX "comments_status_idx" ON "comments" USING HASH ("status");

-- CreateIndex
CREATE INDEX "comments_content_idx" ON "comments"("content");

-- CreateIndex
CREATE INDEX "comments_updatedAt_idx" ON "comments"("updatedAt");

-- CreateIndex
CREATE INDEX "reports_for_comment_userId_idx" ON "reports_for_comment"("userId");

-- CreateIndex
CREATE INDEX "reports_for_comment_commentId_idx" ON "reports_for_comment"("commentId");

-- CreateIndex
CREATE INDEX "reports_for_comment_status_idx" ON "reports_for_comment" USING HASH ("status");

-- CreateIndex
CREATE INDEX "reports_for_comment_reason_idx" ON "reports_for_comment"("reason");

-- CreateIndex
CREATE INDEX "reports_for_comment_updatedAt_idx" ON "reports_for_comment"("updatedAt");

-- CreateIndex
CREATE INDEX "likes_userId_idx" ON "likes"("userId");

-- CreateIndex
CREATE INDEX "likes_commentId_idx" ON "likes"("commentId");

-- CreateIndex
CREATE INDEX "likes_updatedAt_idx" ON "likes"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "likes_userId_commentId_key" ON "likes"("userId", "commentId");

-- CreateIndex
CREATE INDEX "oauth2_linked_accounts_userId_idx" ON "oauth2_linked_accounts"("userId");

-- CreateIndex
CREATE INDEX "oauth2_linked_accounts_provider_idx" ON "oauth2_linked_accounts" USING HASH ("provider");

-- CreateIndex
CREATE INDEX "oauth2_linked_accounts_accountId_idx" ON "oauth2_linked_accounts" USING HASH ("accountId");

-- CreateIndex
CREATE INDEX "oauth2_linked_accounts_name_idx" ON "oauth2_linked_accounts"("name");

-- CreateIndex
CREATE INDEX "oauth2_linked_accounts_email_idx" ON "oauth2_linked_accounts"("email");

-- CreateIndex
CREATE INDEX "oauth2_linked_accounts_avatarUrl_idx" ON "oauth2_linked_accounts"("avatarUrl");

-- CreateIndex
CREATE INDEX "message_channels_name_idx" ON "message_channels"("name");

-- CreateIndex
CREATE INDEX "message_channels_channelType_idx" ON "message_channels" USING HASH ("channelType");

-- CreateIndex
CREATE INDEX "message_channel_participants_channelId_idx" ON "message_channel_participants"("channelId");

-- CreateIndex
CREATE INDEX "message_channel_participants_userId_idx" ON "message_channel_participants"("userId");

-- CreateIndex
CREATE INDEX "message_channel_participants_conversationMuted_idx" ON "message_channel_participants" USING HASH ("conversationMuted");

-- CreateIndex
CREATE UNIQUE INDEX "message_channel_participants_channelId_userId_key" ON "message_channel_participants"("channelId", "userId");

-- CreateIndex
CREATE INDEX "messages_channelId_idx" ON "messages"("channelId");

-- CreateIndex
CREATE INDEX "messages_userId_idx" ON "messages"("userId");

-- CreateIndex
CREATE INDEX "messages_messageType_idx" ON "messages" USING HASH ("messageType");

-- CreateIndex
CREATE INDEX "stories_profileId_idx" ON "stories"("profileId");

-- CreateIndex
CREATE INDEX "stories_updatedAt_idx" ON "stories"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "story_viewers_creatorId_viewerId_key" ON "story_viewers"("creatorId", "viewerId");

-- CreateIndex
CREATE UNIQUE INDEX "story_medias_storyId_uploadId_key" ON "story_medias"("storyId", "uploadId");

-- CreateIndex
CREATE UNIQUE INDEX "limit_payment_users_creatorId_userId_key" ON "limit_payment_users"("creatorId", "userId");

-- CreateIndex
CREATE INDEX "reports_for_user_creatorId_idx" ON "reports_for_user"("creatorId");

-- CreateIndex
CREATE INDEX "reports_for_user_userId_idx" ON "reports_for_user"("userId");

-- CreateIndex
CREATE INDEX "reports_for_user_status_idx" ON "reports_for_user" USING HASH ("status");

-- CreateIndex
CREATE INDEX "reports_for_user_reason_idx" ON "reports_for_user"("reason");

-- CreateIndex
CREATE INDEX "reports_for_user_updatedAt_idx" ON "reports_for_user"("updatedAt");

-- CreateIndex
CREATE INDEX "tagged_peoples_postId_idx" ON "tagged_peoples"("postId");

-- CreateIndex
CREATE INDEX "tagged_peoples_userId_idx" ON "tagged_peoples"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tagged_peoples_postId_userId_key" ON "tagged_peoples"("postId", "userId");

-- CreateIndex
CREATE INDEX "highlights_title_idx" ON "highlights"("title");

-- CreateIndex
CREATE INDEX "highlights_profileId_idx" ON "highlights"("profileId");

-- CreateIndex
CREATE INDEX "highlights_updatedAt_idx" ON "highlights"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_userId_postId_key" ON "bookmarks"("userId", "postId");

-- AddForeignKey
ALTER TABLE "balances" ADD CONSTRAINT "balances_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gems_spending_logs" ADD CONSTRAINT "gems_spending_logs_spenderId_fkey" FOREIGN KEY ("spenderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gems_spending_logs" ADD CONSTRAINT "gems_spending_logs_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gems_balances" ADD CONSTRAINT "gems_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gem_transactions" ADD CONSTRAINT "gem_transactions_balanceId_fkey" FOREIGN KEY ("balanceId") REFERENCES "gems_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_subscriptions" ADD CONSTRAINT "payment_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_subscriptions" ADD CONSTRAINT "payment_subscriptions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_subscriptions" ADD CONSTRAINT "payment_subscriptions_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_subscriptions" ADD CONSTRAINT "payment_subscriptions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_subscriptions" ADD CONSTRAINT "payment_subscriptions_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_subscriptions" ADD CONSTRAINT "payment_subscriptions_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "bundles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_subscriptions" ADD CONSTRAINT "payment_subscriptions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_code" ADD CONSTRAINT "otp_code_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_link" ADD CONSTRAINT "social_link_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundles" ADD CONSTRAINT "bundles_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_levels" ADD CONSTRAINT "user_levels_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_logs" ADD CONSTRAINT "xp_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_logs" ADD CONSTRAINT "xp_logs_verifiedUserId_fkey" FOREIGN KEY ("verifiedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paid_posts" ADD CONSTRAINT "paid_posts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fundraisers" ADD CONSTRAINT "fundraisers_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giveways" ADD CONSTRAINT "giveways_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polls" ADD CONSTRAINT "polls_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_categories" ADD CONSTRAINT "role_categories_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_categories" ADD CONSTRAINT "role_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_posts" ADD CONSTRAINT "role_posts_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_posts" ADD CONSTRAINT "role_posts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_giveways" ADD CONSTRAINT "role_giveways_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_giveways" ADD CONSTRAINT "role_giveways_givewayId_fkey" FOREIGN KEY ("givewayId") REFERENCES "giveways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_polls" ADD CONSTRAINT "role_polls_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_polls" ADD CONSTRAINT "role_polls_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_posts" ADD CONSTRAINT "playlist_posts_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_posts" ADD CONSTRAINT "playlist_posts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_uploads" ADD CONSTRAINT "playlist_uploads_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_uploads" ADD CONSTRAINT "playlist_uploads_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports_for_profile" ADD CONSTRAINT "reports_for_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports_for_profile" ADD CONSTRAINT "reports_for_profile_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports_for_post" ADD CONSTRAINT "reports_for_post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports_for_post" ADD CONSTRAINT "reports_for_post_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_list" ADD CONSTRAINT "user_list_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userlist_user" ADD CONSTRAINT "userlist_user_userlistId_fkey" FOREIGN KEY ("userlistId") REFERENCES "user_list"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userlist_user" ADD CONSTRAINT "userlist_user_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports_for_comment" ADD CONSTRAINT "reports_for_comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports_for_comment" ADD CONSTRAINT "reports_for_comment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth2_linked_accounts" ADD CONSTRAINT "oauth2_linked_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_channel_participants" ADD CONSTRAINT "message_channel_participants_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "message_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_channel_participants" ADD CONSTRAINT "message_channel_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "message_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_viewers" ADD CONSTRAINT "story_viewers_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_viewers" ADD CONSTRAINT "story_viewers_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_medias" ADD CONSTRAINT "story_medias_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_medias" ADD CONSTRAINT "story_medias_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "limit_payment_users" ADD CONSTRAINT "limit_payment_users_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "limit_payment_users" ADD CONSTRAINT "limit_payment_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_previews" ADD CONSTRAINT "profile_previews_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports_for_user" ADD CONSTRAINT "reports_for_user_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports_for_user" ADD CONSTRAINT "reports_for_user_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tagged_peoples" ADD CONSTRAINT "tagged_peoples_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tagged_peoples" ADD CONSTRAINT "tagged_peoples_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
