-- AlterTable: Add userProviderKeyId to LLMConfig
ALTER TABLE "llm_configs" ADD COLUMN "user_provider_key_id" TEXT;

-- CreateTable: UserProviderApiKey
CREATE TABLE "user_provider_api_keys" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "user_id" TEXT NOT NULL,
    "provider" "LiteLLMProvider" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "api_key" TEXT NOT NULL,

    CONSTRAINT "user_provider_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_provider" ON "user_provider_api_keys"("user_id", "provider");
CREATE INDEX "user_provider_api_keys_user_id_idx" ON "user_provider_api_keys"("user_id");

-- CreateIndex for LLMConfig FK
CREATE INDEX "llm_configs_user_provider_key_id_idx" ON "llm_configs"("user_provider_key_id");

-- AddForeignKey
ALTER TABLE "user_provider_api_keys" ADD CONSTRAINT "user_provider_api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "llm_configs" ADD CONSTRAINT "llm_configs_user_provider_key_id_fkey" FOREIGN KEY ("user_provider_key_id") REFERENCES "user_provider_api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
