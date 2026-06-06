-- Add the PlanDefinition table — internal source of truth for the
-- monthly credit limit of each subscription tier. The model is
-- keyed on the SubscriptionPlan enum, so the primary key is the
-- unique index that the upsert path in SubscriptionService relies
-- on. Seed rows for FREE/PRO/BUSINESS keep the admin endpoints and
-- the runtime lookup from being empty-handed on a fresh database.

CREATE TABLE "plan_definitions" (
    "plan" "SubscriptionPlan" NOT NULL,
    "monthly_credit_limit" INTEGER NOT NULL DEFAULT 1000,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by_user_id" TEXT,

    CONSTRAINT "plan_definitions_pkey" PRIMARY KEY ("plan")
);

INSERT INTO "plan_definitions" ("plan", "monthly_credit_limit", "updated_at")
VALUES
    ('FREE', 1000, CURRENT_TIMESTAMP),
    ('PRO', 1000, CURRENT_TIMESTAMP),
    ('BUSINESS', 1000, CURRENT_TIMESTAMP)
ON CONFLICT ("plan") DO NOTHING;
