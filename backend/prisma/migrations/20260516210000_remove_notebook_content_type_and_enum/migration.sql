/*
  Warnings:

  - The value `NOTEBOOK` on the enum `DocumentType` will be removed. If this variant is still used in the `documents` table, this will fail.
  - The column `content_type` on the `notebooks` table will be removed. Existing values will be lost.

*/

-- AlterEnum: Remove NOTEBOOK from DocumentType
BEGIN;
CREATE TYPE "DocumentType_new" AS ENUM ('EXTENSION', 'CRAWLED_URL', 'FILE', 'SLACK_CONNECTOR', 'NOTION_CONNECTOR', 'YOUTUBE_VIDEO', 'GITHUB_CONNECTOR', 'GOOGLE_CALENDAR_CONNECTOR', 'GOOGLE_GMAIL_CONNECTOR');
ALTER TABLE "documents" ALTER COLUMN "document_type" TYPE "DocumentType_new" USING ("document_type"::text::"DocumentType_new");
ALTER TYPE "DocumentType" RENAME TO "DocumentType_old";
ALTER TYPE "DocumentType_new" RENAME TO "DocumentType";
DROP TYPE "DocumentType_old";
COMMIT;

-- DropColumn: Remove content_type from notebooks
ALTER TABLE "notebooks" DROP COLUMN "content_type";
