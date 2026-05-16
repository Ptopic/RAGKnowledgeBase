-- AlterTable: Add apiKeyPreview column for masked display
ALTER TABLE "llm_configs" ADD COLUMN "api_key_preview" VARCHAR(50);
