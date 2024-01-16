-- Step 1: Add new columns
ALTER TABLE "balances" ADD COLUMN "amount_new" INTEGER DEFAULT 0;
ALTER TABLE "gem_transactions" ADD COLUMN "amount_new" INTEGER;
ALTER TABLE "gem_transactions" ADD COLUMN "processingFee_new" INTEGER;
ALTER TABLE "gem_transactions" ADD COLUMN "platformFee_new" INTEGER;
ALTER TABLE "gems_balances" ADD COLUMN "amount_new" INTEGER DEFAULT 0;
ALTER TABLE "gems_spending_logs" ADD COLUMN "amount_new" INTEGER;
ALTER TABLE "gems_spending_logs" ADD COLUMN "platformFee_new" INTEGER;
ALTER TABLE "payment_subscription_transactions" ADD COLUMN "amount_new" INTEGER;
ALTER TABLE "payment_subscriptions" ADD COLUMN "amount_new" INTEGER;
ALTER TABLE "payment_subscriptions" ADD COLUMN "processingFee_new" INTEGER;
ALTER TABLE "payment_subscriptions" ADD COLUMN "platformFee_new" INTEGER;
ALTER TABLE "payout_logs" ADD COLUMN "amount_new" INTEGER;
ALTER TABLE "payout_logs" ADD COLUMN "platformFee_new" INTEGER;
ALTER TABLE "payout_logs" ADD COLUMN "processingFee_new" INTEGER;

-- Step 2: Populate new columns
UPDATE "balances" SET "amount_new" = ROUND("amount" * 100)::INTEGER WHERE "amount" IS NOT NULL;
UPDATE "gem_transactions" SET "amount_new" = ROUND("amount" * 100)::INTEGER WHERE "amount" IS NOT NULL;
UPDATE "gem_transactions" SET "processingFee_new" = ROUND("processingFee" * 100)::INTEGER WHERE "processingFee" IS NOT NULL;
UPDATE "gem_transactions" SET "platformFee_new" = ROUND("platformFee" * 100)::INTEGER WHERE "platformFee" IS NOT NULL;
UPDATE "gems_balances" SET "amount_new" = ROUND("amount" * 100)::INTEGER WHERE "amount" IS NOT NULL;
UPDATE "gems_spending_logs" SET "amount_new" = ROUND("amount" * 100)::INTEGER WHERE "amount" IS NOT NULL;
UPDATE "gems_spending_logs" SET "platformFee_new" = ROUND("platformFee" * 100)::INTEGER WHERE "platformFee" IS NOT NULL;
UPDATE "payment_subscription_transactions" SET "amount_new" = ROUND("amount" * 100)::INTEGER WHERE "amount" IS NOT NULL;
UPDATE "payment_subscriptions" SET "amount_new" = ROUND("amount" * 100)::INTEGER WHERE "amount" IS NOT NULL;
UPDATE "payment_subscriptions" SET "processingFee_new" = ROUND("processingFee" * 100)::INTEGER WHERE "processingFee" IS NOT NULL;
UPDATE "payment_subscriptions" SET "platformFee_new" = ROUND("platformFee" * 100)::INTEGER WHERE "platformFee" IS NOT NULL;
UPDATE "payout_logs" SET "amount_new" = ROUND("amount" * 100)::INTEGER WHERE "amount" IS NOT NULL;
UPDATE "payout_logs" SET "platformFee_new" = ROUND("platformFee" * 100)::INTEGER WHERE "platformFee" IS NOT NULL;
UPDATE "payout_logs" SET "processingFee_new" = ROUND("processingFee" * 100)::INTEGER WHERE "processingFee" IS NOT NULL;

-- Step 3: Drop old columns
ALTER TABLE "balances" DROP COLUMN "amount";
ALTER TABLE "gem_transactions" DROP COLUMN "amount";
ALTER TABLE "gem_transactions" DROP COLUMN "processingFee";
ALTER TABLE "gem_transactions" DROP COLUMN "platformFee";
ALTER TABLE "gems_balances" DROP COLUMN "amount";
ALTER TABLE "gems_spending_logs" DROP COLUMN "amount";
ALTER TABLE "gems_spending_logs" DROP COLUMN "platformFee";
ALTER TABLE "payment_subscription_transactions" DROP COLUMN "amount";
ALTER TABLE "payment_subscriptions" DROP COLUMN "amount";
ALTER TABLE "payment_subscriptions" DROP COLUMN "processingFee";
ALTER TABLE "payment_subscriptions" DROP COLUMN "platformFee";
ALTER TABLE "payout_logs" DROP COLUMN "amount";
ALTER TABLE "payout_logs" DROP COLUMN "platformFee";
ALTER TABLE "payout_logs" DROP COLUMN "processingFee";

-- Step 4: Rename new columns
ALTER TABLE "balances" RENAME COLUMN "amount_new" TO "amount";
ALTER TABLE "gem_transactions" RENAME COLUMN "amount_new" TO "amount";
ALTER TABLE "gem_transactions" RENAME COLUMN "processingFee_new" TO "processingFee";
ALTER TABLE "gem_transactions" RENAME COLUMN "platformFee_new" TO "platformFee";
ALTER TABLE "gems_balances" RENAME COLUMN "amount_new" TO "amount";
ALTER TABLE "gems_spending_logs" RENAME COLUMN "amount_new" TO "amount";
ALTER TABLE "gems_spending_logs" RENAME COLUMN "platformFee_new" TO "platformFee";
ALTER TABLE "payment_subscription_transactions" RENAME COLUMN "amount_new" TO "amount";
ALTER TABLE "payment_subscriptions" RENAME COLUMN "amount_new" TO "amount";
ALTER TABLE "payment_subscriptions" RENAME COLUMN "processingFee_new" TO "processingFee";
ALTER TABLE "payment_subscriptions" RENAME COLUMN "platformFee_new" TO "platformFee";
ALTER TABLE "payout_logs" RENAME COLUMN "amount_new" TO "amount";
ALTER TABLE "payout_logs" RENAME COLUMN "platformFee_new" TO "platformFee";
ALTER TABLE "payout_logs" RENAME COLUMN "processingFee_new" TO "processingFee";
