/*
  Warnings:

  - The values [LINEAR_CONNECTOR,DISCORD_CONNECTOR,JIRA_CONNECTOR,CONFLUENCE_CONNECTOR,CLICKUP_CONNECTOR,AIRTABLE_CONNECTOR,LUMA_CONNECTOR,ELASTICSEARCH_CONNECTOR] on the enum `DocumentType` will be removed. If these variants are still used in the database, this will fail.
  - The values [SERPER_API,TAVILY_API,SEARXNG_API,LINKUP_API,BAIDU_SEARCH_API,LINEAR_CONNECTOR,DISCORD_CONNECTOR,JIRA_CONNECTOR,CONFLUENCE_CONNECTOR,CLICKUP_CONNECTOR,AIRTABLE_CONNECTOR,LUMA_CONNECTOR,ELASTICSEARCH_CONNECTOR] on the enum `SearchSourceConnectorType` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[reset_token]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DocumentType_new" AS ENUM ('EXTENSION', 'CRAWLED_URL', 'FILE', 'SLACK_CONNECTOR', 'NOTION_CONNECTOR', 'YOUTUBE_VIDEO', 'GITHUB_CONNECTOR', 'GOOGLE_CALENDAR_CONNECTOR', 'GOOGLE_GMAIL_CONNECTOR');
ALTER TABLE "documents" ALTER COLUMN "document_type" TYPE "DocumentType_new" USING ("document_type"::text::"DocumentType_new");
ALTER TYPE "DocumentType" RENAME TO "DocumentType_old";
ALTER TYPE "DocumentType_new" RENAME TO "DocumentType";
DROP TYPE "DocumentType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "SearchSourceConnectorType_new" AS ENUM ('SLACK_CONNECTOR', 'NOTION_CONNECTOR', 'GITHUB_CONNECTOR', 'GOOGLE_CALENDAR_CONNECTOR', 'GOOGLE_GMAIL_CONNECTOR');
ALTER TABLE "search_source_connectors" ALTER COLUMN "connector_type" TYPE "SearchSourceConnectorType_new" USING ("connector_type"::text::"SearchSourceConnectorType_new");
ALTER TYPE "SearchSourceConnectorType" RENAME TO "SearchSourceConnectorType_old";
ALTER TYPE "SearchSourceConnectorType_new" RENAME TO "SearchSourceConnectorType";
DROP TYPE "SearchSourceConnectorType_old";
COMMIT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "reset_token" TEXT,
ADD COLUMN     "reset_token_expires" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "user_reset_token_key" ON "user"("reset_token");
