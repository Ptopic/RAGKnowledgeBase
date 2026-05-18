/*
  Warnings:

  - The values [BLOG] on the enum `DocumentType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `blogs` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DocumentType_new" AS ENUM ('EXTENSION', 'CRAWLED_URL', 'FILE', 'SLACK_CONNECTOR', 'NOTION_CONNECTOR', 'YOUTUBE_VIDEO', 'GITHUB_CONNECTOR', 'GOOGLE_CALENDAR_CONNECTOR', 'GOOGLE_GMAIL_CONNECTOR', 'NOTEBOOK');
ALTER TABLE "documents" ALTER COLUMN "document_type" TYPE "DocumentType_new" USING ("document_type"::text::"DocumentType_new");
ALTER TYPE "DocumentType" RENAME TO "DocumentType_old";
ALTER TYPE "DocumentType_new" RENAME TO "DocumentType";
DROP TYPE "DocumentType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "blogs" DROP CONSTRAINT "blogs_author_id_fkey";

-- DropForeignKey
ALTER TABLE "blogs" DROP CONSTRAINT "blogs_search_space_id_fkey";

-- CreateTable
CREATE TABLE "notebooks" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(300) NOT NULL,
    "content" TEXT NOT NULL,
    "content_type" VARCHAR(20) NOT NULL DEFAULT 'html',
    "excerpt" VARCHAR(500),
    "search_space_id" INTEGER NOT NULL,
    "author_id" TEXT NOT NULL,

    CONSTRAINT "notebooks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notebooks_slug_key" ON "notebooks"("slug");

-- CreateIndex
CREATE INDEX "notebooks_search_space_id_idx" ON "notebooks"("search_space_id");

-- CreateIndex
CREATE INDEX "notebooks_slug_idx" ON "notebooks"("slug");

-- CreateIndex
CREATE INDEX "notebooks_author_id_idx" ON "notebooks"("author_id");

-- Preserve existing blog data before dropping the table
INSERT INTO "notebooks" ("id", "created_at", "updated_at", "title", "slug", "content", "content_type", "excerpt", "search_space_id", "author_id")
SELECT "id", "created_at", "updated_at", "title", "slug", "content", 'html', "excerpt", "search_space_id", "author_id"
FROM "blogs";

-- DropTable
DROP TABLE "blogs";

-- AddForeignKey
ALTER TABLE "notebooks" ADD CONSTRAINT "notebooks_search_space_id_fkey" FOREIGN KEY ("search_space_id") REFERENCES "searchspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notebooks" ADD CONSTRAINT "notebooks_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
