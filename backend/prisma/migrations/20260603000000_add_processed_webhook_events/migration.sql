-- Add ProcessedWebhookEvent table for Stripe webhook idempotency.
-- Stripe guarantees at-least-once delivery, so handlers must dedupe
-- by event id. A unique constraint on event_id makes the check atomic
-- and concurrent-safe.

CREATE TABLE "processed_webhook_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "processed_webhook_events_event_id_key" ON "processed_webhook_events"("event_id");
CREATE INDEX "processed_webhook_events_event_type_idx" ON "processed_webhook_events"("event_type");
CREATE INDEX "processed_webhook_events_processed_at_idx" ON "processed_webhook_events"("processed_at");
