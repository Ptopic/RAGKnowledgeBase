-- Drop the legacy page-based quota columns from the `user` table.
-- These were replaced by Subscription.creditsUsed / monthlyCreditLimit
-- in ZR-263. Frontend no longer reads or writes these fields.

ALTER TABLE "user" DROP COLUMN IF EXISTS "pages_limit";
ALTER TABLE "user" DROP COLUMN IF EXISTS "pages_used";
