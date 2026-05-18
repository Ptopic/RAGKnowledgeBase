-- AlterTable: Add publish fields to notebooks
ALTER TABLE "notebooks" ADD COLUMN "is_published" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "notebooks" ADD COLUMN "published_at" TIMESTAMPTZ;

-- CreateIndex: Add index on is_published for public queries
CREATE INDEX "notebooks_is_published_idx" ON "notebooks"("is_published");
