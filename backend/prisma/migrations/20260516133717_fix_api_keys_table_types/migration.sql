-- AlterTable
ALTER TABLE "user_provider_api_keys" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- RenameIndex
ALTER INDEX "uq_user_provider" RENAME TO "user_provider_api_keys_user_id_provider_key";
