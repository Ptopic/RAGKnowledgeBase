import { z } from 'zod';

/**
 * Validation schema for environment variables using Zod
 * Ensures all required configuration is present and valid
 */
const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default('0.0.0.0'),

  // Database (Required)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Frontend & Backend URLs
  NEXT_FRONTEND_URL: z.string().url().optional(),
  BACKEND_URL: z.string().url().optional(),

  // Auth
  AUTH_TYPE: z.enum(['jwt', 'oauth']).default('jwt'),
  SECRET_KEY: z.string().min(1, 'SECRET_KEY is required'),
  REGISTRATION_ENABLED: z.enum(['TRUE', 'FALSE']).default('TRUE'),

  // Google OAuth
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALENDAR_REDIRECT_URI: z.string().url().optional(),
  GOOGLE_GMAIL_REDIRECT_URI: z.string().url().optional(),

  // Airtable OAuth
  AIRTABLE_CLIENT_ID: z.string().optional(),
  AIRTABLE_CLIENT_SECRET: z.string().optional(),
  AIRTABLE_REDIRECT_URI: z.string().url().optional(),

  // Embedding Configuration
  EMBEDDING_MODEL: z
    .string()
    .default('sentence-transformers/all-MiniLM-L6-v2'),
  EMBEDDING_MAX_SEQ_LENGTH: z.coerce.number().default(512),
  CHUNK_SIZE: z.coerce.number().default(512),

  // Azure OpenAI
  AZURE_OPENAI_ENDPOINT: z.string().url().optional().or(z.literal('')),
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_API_VERSION: z.string().default('2024-10-21'),
  AZURE_OPENAI_DEPLOYMENT: z.string().optional(),

  // Reranker
  RERANKERS_ENABLED: z.enum(['TRUE', 'FALSE']).default('FALSE'),
  RERANKERS_MODEL_NAME: z.string().optional(),
  RERANKERS_MODEL_TYPE: z.string().optional(),

  // ETL Service
  ETL_SERVICE: z
    .enum(['UNSTRUCTURED', 'LLAMACLOUD', 'DOCLING'])
    .default('DOCLING'),
  UNSTRUCTURED_API_KEY: z.string().optional(),
  LLAMA_CLOUD_API_KEY: z.string().optional(),
  FIRECRAWL_API_KEY: z.string().optional(),

  // TTS
  TTS_SERVICE: z.string().optional(),
  TTS_SERVICE_API_BASE: z.string().url().optional().or(z.literal('')),
  TTS_SERVICE_API_KEY: z.string().optional(),

  // STT
  STT_SERVICE: z.string().optional(),
  STT_SERVICE_API_BASE: z.string().url().optional().or(z.literal('')),
  STT_SERVICE_API_KEY: z.string().optional(),

  // Redis/Queue
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),

  // LangSmith
  LANGSMITH_API_KEY: z.string().optional(),
  LANGCHAIN_PROJECT: z.string().optional(),
  LANGCHAIN_TRACING_V2: z.enum(['TRUE', 'FALSE']).default('FALSE'),

  // Connector API Keys
  GITHUB_TOKEN: z.string().optional(),
  SLACK_TOKEN: z.string().optional(),
  NOTION_TOKEN: z.string().optional(),
  LINEAR_API_KEY: z.string().optional(),
  JIRA_EMAIL: z.string().email().optional().or(z.literal('')),
  JIRA_API_TOKEN: z.string().optional(),
  JIRA_SERVER_URL: z.string().url().optional().or(z.literal('')),
  CONFLUENCE_EMAIL: z.string().email().optional().or(z.literal('')),
  CONFLUENCE_API_TOKEN: z.string().optional(),
  CONFLUENCE_BASE_URL: z.string().url().optional().or(z.literal('')),
  DISCORD_TOKEN: z.string().optional(),
  CLICKUP_API_KEY: z.string().optional(),
  LUMA_API_KEY: z.string().optional(),
  ELASTICSEARCH_HOST: z.string().url().optional().or(z.literal('')),
  ELASTICSEARCH_USERNAME: z.string().optional(),
  ELASTICSEARCH_PASSWORD: z.string().optional(),

  // Search APIs
  TAVILY_API_KEY: z.string().optional(),
  LINKUP_API_KEY: z.string().optional(),
  SEARXNG_URL: z.string().url().optional().or(z.literal('')),
  BAIDU_API_KEY: z.string().optional(),

  // LLM Provider Keys
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  COHERE_API_KEY: z.string().optional(),
});

/**
 * Validate and parse environment variables
 * Returns validated config or throws with detailed error messages
 */
export const validateConfig = (config: Record<string, unknown>) => {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.errors.map(
      (err) => `${err.path.join('.')}: ${err.message}`,
    );
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  return result.data;
};

// Export the schema type for use in other files
export type EnvConfig = z.infer<typeof envSchema>;
