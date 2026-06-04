-- Add the `cancel_at` column to `subscriptions`.
-- The `cancelAt` field was added to the schema in ZR-263 but the
-- corresponding migration was never generated, so production was
-- missing the column and every `prisma.subscription.upsert()` failed.
-- Nullable to match `DateTime?`; bare `TIMESTAMP` to stay consistent
-- with the other timestamp columns on this table.

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancel_at" TIMESTAMP;
