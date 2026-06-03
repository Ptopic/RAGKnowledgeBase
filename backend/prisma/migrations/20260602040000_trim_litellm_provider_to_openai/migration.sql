-- Trim the LiteLLMProvider enum down to OPENAI only.
-- The application now ships with a single OpenAI provider per ZR-263;
-- any other provider values that may exist are collapsed to OPENAI
-- before the type itself is rewritten.
--
-- Uses the canonical Postgres pattern: create a new enum, cast
-- columns, drop the old enum, rename the new one back.

-- 1. Collapse any non-OPENAI rows (defensive — should be a no-op given
--    that no other providers are in active use).
UPDATE "llm_configs"
   SET "provider" = 'OPENAI'
 WHERE "provider" <> 'OPENAI';

UPDATE "user_provider_api_keys"
   SET "provider" = 'OPENAI'
 WHERE "provider" <> 'OPENAI';

-- 2. Create the replacement enum with only OPENAI.
CREATE TYPE "LiteLLMProvider_new" AS ENUM ('OPENAI');

-- 3. Switch the two columns onto the new type. We drop the default
--    first because Postgres won't let us change the type of a column
--    that has a default referencing the old enum.
ALTER TABLE "llm_configs"
  ALTER COLUMN "provider" DROP DEFAULT;
ALTER TABLE "llm_configs"
  ALTER COLUMN "provider" TYPE "LiteLLMProvider_new"
  USING ("provider"::text::"LiteLLMProvider_new");

ALTER TABLE "user_provider_api_keys"
  ALTER COLUMN "provider" DROP DEFAULT;
ALTER TABLE "user_provider_api_keys"
  ALTER COLUMN "provider" TYPE "LiteLLMProvider_new"
  USING ("provider"::text::"LiteLLMProvider_new");

-- 4. Drop the old enum and rename the new one back to its original name.
DROP TYPE "LiteLLMProvider";
ALTER TYPE "LiteLLMProvider_new" RENAME TO "LiteLLMProvider";
