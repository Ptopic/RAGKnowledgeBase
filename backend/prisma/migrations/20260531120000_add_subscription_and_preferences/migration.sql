-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PRO', 'BUSINESS');

-- AlterTable: add preferred_language column to "user" table
ALTER TABLE "user" ADD COLUMN "preferred_language" VARCHAR(50) NOT NULL DEFAULT 'English';

-- CreateTable: subscriptions
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "status" VARCHAR NOT NULL DEFAULT 'active',
    "stripe_customer_id" VARCHAR,
    "stripe_subscription_id" VARCHAR,
    "stripe_price_id" VARCHAR,
    "monthly_credit_limit" INTEGER NOT NULL DEFAULT 1000,
    "credits_used" INTEGER NOT NULL DEFAULT 0,
    "current_period_start" TIMESTAMP NOT NULL,
    "current_period_end" TIMESTAMP NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: usage_records
CREATE TABLE "usage_records" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "user_id" UUID NOT NULL,
    "search_space_id" INTEGER NOT NULL,
    "operation_type" VARCHAR NOT NULL,
    "credits" INTEGER NOT NULL,
    "tokens_in" INTEGER,
    "tokens_out" INTEGER,
    "model_used" VARCHAR,
    "billed_to_user_key" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_stripe_customer_id_idx" ON "subscriptions"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "usage_records_user_id_created_at_idx" ON "usage_records"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "usage_records_operation_type_idx" ON "usage_records"("operation_type");

-- AddForeignKey: subscriptions -> user
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: usage_records -> user
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: usage_records -> search_space
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_search_space_id_fkey" FOREIGN KEY ("search_space_id") REFERENCES "searchspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: add is_platform_key column to llm_configs
ALTER TABLE "llm_configs" ADD COLUMN IF NOT EXISTS "is_platform_key" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: add last_processed_invoice_id column to subscriptions
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "last_processed_invoice_id" VARCHAR(255);
