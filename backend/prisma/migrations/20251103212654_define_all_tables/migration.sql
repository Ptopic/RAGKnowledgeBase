/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('EXTENSION', 'CRAWLED_URL', 'FILE', 'SLACK_CONNECTOR', 'NOTION_CONNECTOR', 'YOUTUBE_VIDEO', 'GITHUB_CONNECTOR', 'LINEAR_CONNECTOR', 'DISCORD_CONNECTOR', 'JIRA_CONNECTOR', 'CONFLUENCE_CONNECTOR', 'CLICKUP_CONNECTOR', 'GOOGLE_CALENDAR_CONNECTOR', 'GOOGLE_GMAIL_CONNECTOR', 'AIRTABLE_CONNECTOR', 'LUMA_CONNECTOR', 'ELASTICSEARCH_CONNECTOR');

-- CreateEnum
CREATE TYPE "SearchSourceConnectorType" AS ENUM ('SERPER_API', 'TAVILY_API', 'SEARXNG_API', 'LINKUP_API', 'BAIDU_SEARCH_API', 'SLACK_CONNECTOR', 'NOTION_CONNECTOR', 'GITHUB_CONNECTOR', 'LINEAR_CONNECTOR', 'DISCORD_CONNECTOR', 'JIRA_CONNECTOR', 'CONFLUENCE_CONNECTOR', 'CLICKUP_CONNECTOR', 'GOOGLE_CALENDAR_CONNECTOR', 'GOOGLE_GMAIL_CONNECTOR', 'AIRTABLE_CONNECTOR', 'LUMA_CONNECTOR', 'ELASTICSEARCH_CONNECTOR');

-- CreateEnum
CREATE TYPE "ChatType" AS ENUM ('QNA');

-- CreateEnum
CREATE TYPE "LiteLLMProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GROQ', 'COHERE', 'HUGGINGFACE', 'AZURE_OPENAI', 'GOOGLE', 'AWS_BEDROCK', 'OLLAMA', 'MISTRAL', 'TOGETHER_AI', 'OPENROUTER', 'REPLICATE', 'PALM', 'VERTEX_AI', 'ANYSCALE', 'PERPLEXITY', 'DEEPINFRA', 'AI21', 'NLPCLOUD', 'ALEPH_ALPHA', 'PETALS', 'COMETAPI', 'DEEPSEEK', 'ALIBABA_QWEN', 'MOONSHOT', 'ZHIPU', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('IN_PROGRESS', 'SUCCESS', 'FAILED');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "hashed_password" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_superuser" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "full_name" TEXT,
    "picture" TEXT,
    "pages_limit" INTEGER NOT NULL DEFAULT 500,
    "pages_used" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_account" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "oauth_name" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "expires_at" INTEGER,
    "refresh_token" TEXT,
    "account_id" TEXT NOT NULL,
    "account_email" TEXT NOT NULL,

    CONSTRAINT "oauth_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "searchspaces" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "user_id" TEXT NOT NULL,

    CONSTRAINT "searchspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" VARCHAR(255) NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "document_metadata" JSONB,
    "content" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "unique_identifier_hash" TEXT,
    "embedding" vector,
    "search_space_id" INTEGER NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chunks" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "embedding" vector,
    "document_id" INTEGER NOT NULL,

    CONSTRAINT "chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chats" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "ChatType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "initial_connectors" TEXT[],
    "messages" JSONB NOT NULL,
    "search_space_id" INTEGER NOT NULL,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_source_connectors" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(100) NOT NULL,
    "connector_type" "SearchSourceConnectorType" NOT NULL,
    "is_indexable" BOOLEAN NOT NULL DEFAULT false,
    "last_indexed_at" TIMESTAMPTZ,
    "config" JSONB NOT NULL,
    "periodic_indexing_enabled" BOOLEAN NOT NULL DEFAULT false,
    "indexing_frequency_minutes" INTEGER,
    "next_scheduled_at" TIMESTAMPTZ,
    "search_space_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "search_source_connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_configs" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(100) NOT NULL,
    "provider" "LiteLLMProvider" NOT NULL,
    "custom_provider" VARCHAR(100),
    "model_name" VARCHAR(100) NOT NULL,
    "api_key" TEXT NOT NULL,
    "api_base" VARCHAR(500),
    "language" VARCHAR(50) DEFAULT 'English',
    "litellm_params" JSONB DEFAULT '{}',
    "search_space_id" INTEGER NOT NULL,

    CONSTRAINT "llm_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_search_space_preferences" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "search_space_id" INTEGER NOT NULL,
    "long_context_llm_id" INTEGER,
    "fast_llm_id" INTEGER,
    "strategic_llm_id" INTEGER,

    CONSTRAINT "user_search_space_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" "LogLevel" NOT NULL,
    "status" "LogStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "source" VARCHAR(200),
    "log_metadata" JSONB DEFAULT '{}',
    "search_space_id" INTEGER NOT NULL,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "oauth_account_user_id_idx" ON "oauth_account"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_account_oauth_name_account_id_key" ON "oauth_account"("oauth_name", "account_id");

-- CreateIndex
CREATE INDEX "searchspaces_name_idx" ON "searchspaces"("name");

-- CreateIndex
CREATE INDEX "searchspaces_user_id_idx" ON "searchspaces"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "documents_content_hash_key" ON "documents"("content_hash");

-- CreateIndex
CREATE UNIQUE INDEX "documents_unique_identifier_hash_key" ON "documents"("unique_identifier_hash");

-- CreateIndex
CREATE INDEX "documents_title_idx" ON "documents"("title");

-- CreateIndex
CREATE INDEX "documents_content_hash_idx" ON "documents"("content_hash");

-- CreateIndex
CREATE INDEX "documents_unique_identifier_hash_idx" ON "documents"("unique_identifier_hash");

-- CreateIndex
CREATE INDEX "documents_search_space_id_idx" ON "documents"("search_space_id");

-- CreateIndex
CREATE INDEX "chunks_document_id_idx" ON "chunks"("document_id");

-- CreateIndex
CREATE INDEX "chats_title_idx" ON "chats"("title");

-- CreateIndex
CREATE INDEX "chats_search_space_id_idx" ON "chats"("search_space_id");

-- CreateIndex
CREATE INDEX "search_source_connectors_name_idx" ON "search_source_connectors"("name");

-- CreateIndex
CREATE INDEX "search_source_connectors_search_space_id_idx" ON "search_source_connectors"("search_space_id");

-- CreateIndex
CREATE INDEX "search_source_connectors_user_id_idx" ON "search_source_connectors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "search_source_connectors_search_space_id_user_id_connector__key" ON "search_source_connectors"("search_space_id", "user_id", "connector_type");

-- CreateIndex
CREATE INDEX "llm_configs_name_idx" ON "llm_configs"("name");

-- CreateIndex
CREATE INDEX "llm_configs_search_space_id_idx" ON "llm_configs"("search_space_id");

-- CreateIndex
CREATE INDEX "user_search_space_preferences_user_id_idx" ON "user_search_space_preferences"("user_id");

-- CreateIndex
CREATE INDEX "user_search_space_preferences_search_space_id_idx" ON "user_search_space_preferences"("search_space_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_search_space_preferences_user_id_search_space_id_key" ON "user_search_space_preferences"("user_id", "search_space_id");

-- CreateIndex
CREATE INDEX "logs_level_idx" ON "logs"("level");

-- CreateIndex
CREATE INDEX "logs_status_idx" ON "logs"("status");

-- CreateIndex
CREATE INDEX "logs_source_idx" ON "logs"("source");

-- CreateIndex
CREATE INDEX "logs_search_space_id_idx" ON "logs"("search_space_id");

-- AddForeignKey
ALTER TABLE "oauth_account" ADD CONSTRAINT "oauth_account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "searchspaces" ADD CONSTRAINT "searchspaces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_search_space_id_fkey" FOREIGN KEY ("search_space_id") REFERENCES "searchspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_search_space_id_fkey" FOREIGN KEY ("search_space_id") REFERENCES "searchspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_source_connectors" ADD CONSTRAINT "search_source_connectors_search_space_id_fkey" FOREIGN KEY ("search_space_id") REFERENCES "searchspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_source_connectors" ADD CONSTRAINT "search_source_connectors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_configs" ADD CONSTRAINT "llm_configs_search_space_id_fkey" FOREIGN KEY ("search_space_id") REFERENCES "searchspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_search_space_preferences" ADD CONSTRAINT "user_search_space_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_search_space_preferences" ADD CONSTRAINT "user_search_space_preferences_search_space_id_fkey" FOREIGN KEY ("search_space_id") REFERENCES "searchspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_search_space_preferences" ADD CONSTRAINT "user_search_space_preferences_long_context_llm_id_fkey" FOREIGN KEY ("long_context_llm_id") REFERENCES "llm_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_search_space_preferences" ADD CONSTRAINT "user_search_space_preferences_fast_llm_id_fkey" FOREIGN KEY ("fast_llm_id") REFERENCES "llm_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_search_space_preferences" ADD CONSTRAINT "user_search_space_preferences_strategic_llm_id_fkey" FOREIGN KEY ("strategic_llm_id") REFERENCES "llm_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_search_space_id_fkey" FOREIGN KEY ("search_space_id") REFERENCES "searchspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
