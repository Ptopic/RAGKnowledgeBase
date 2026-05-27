-- Add DocumentProcessingStatus enum
CREATE TYPE "DocumentProcessingStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- Make content nullable for placeholder rows
ALTER TABLE "documents" ALTER COLUMN "content" DROP NOT NULL;

-- Make content_hash nullable for placeholder rows
ALTER TABLE "documents" ALTER COLUMN "content_hash" DROP NOT NULL;

-- Add processing status fields
ALTER TABLE "documents" ADD COLUMN "processing_status" "DocumentProcessingStatus" NOT NULL DEFAULT 'COMPLETED';
ALTER TABLE "documents" ADD COLUMN "processing_started_at" TIMESTAMP(3);
ALTER TABLE "documents" ADD COLUMN "processing_completed_at" TIMESTAMP(3);

-- Add index on processing_status
CREATE INDEX "documents_processing_status_idx" ON "documents"("processing_status");
