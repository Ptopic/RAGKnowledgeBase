/**
 * Configuration interface
 * This provides type safety for all configuration values
 */

export interface DatabaseConfig {
  url: string;
}

export interface FrontendConfig {
  url?: string;
}

export interface BackendConfig {
  url?: string;
}

export interface AuthConfig {
  type: string;
  secretKey: string;
  registrationEnabled: boolean;
}

export interface GoogleOAuthConfig {
  clientId?: string;
  clientSecret?: string;
}

export interface GoogleCalendarConfig {
  redirectUri?: string;
}

export interface GoogleGmailConfig {
  redirectUri?: string;
}

export interface GoogleConfig {
  oauth: GoogleOAuthConfig;
  calendar: GoogleCalendarConfig;
  gmail: GoogleGmailConfig;
}

export interface AirtableConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

export interface AzureOpenAIConfig {
  endpoint?: string;
  apiKey?: string;
  apiVersion: string;
  deployment?: string;
}

export interface EmbeddingConfig {
  model: string;
  maxSeqLength: number;
  chunkSize: number;
  azure: AzureOpenAIConfig;
}

export interface RerankerConfig {
  enabled: boolean;
  modelName?: string;
  modelType?: string;
}

export interface UnstructuredConfig {
  apiKey?: string;
}

export interface LlamaCloudConfig {
  apiKey?: string;
}

export interface FirecrawlConfig {
  apiKey?: string;
}

export interface ETLConfig {
  service: 'UNSTRUCTURED' | 'LLAMACLOUD' | 'DOCLING';
  unstructured: UnstructuredConfig;
  llamaCloud: LlamaCloudConfig;
  firecrawl: FirecrawlConfig;
}

export interface TTSConfig {
  service?: string;
  apiBase?: string;
  apiKey?: string;
}

export interface STTConfig {
  service?: string;
  apiBase?: string;
  apiKey?: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

export interface QueueConfig {
  redis: RedisConfig;
}

export interface LangsmithConfig {
  apiKey?: string;
  project?: string;
  tracingEnabled: boolean;
}

export interface GithubConnectorConfig {
  token?: string;
}

export interface SlackConnectorConfig {
  token?: string;
}

export interface NotionConnectorConfig {
  token?: string;
}

export interface LinearConnectorConfig {
  apiKey?: string;
}

export interface JiraConnectorConfig {
  email?: string;
  apiToken?: string;
  serverUrl?: string;
}

export interface ConfluenceConnectorConfig {
  email?: string;
  apiToken?: string;
  baseUrl?: string;
}

export interface DiscordConnectorConfig {
  token?: string;
}

export interface ClickupConnectorConfig {
  apiKey?: string;
}

export interface LumaConnectorConfig {
  apiKey?: string;
}

export interface ElasticsearchConnectorConfig {
  host?: string;
  username?: string;
  password?: string;
}

export interface ConnectorsConfig {
  github: GithubConnectorConfig;
  slack: SlackConnectorConfig;
  notion: NotionConnectorConfig;
  linear: LinearConnectorConfig;
  jira: JiraConnectorConfig;
  confluence: ConfluenceConnectorConfig;
  discord: DiscordConnectorConfig;
  clickup: ClickupConnectorConfig;
  luma: LumaConnectorConfig;
  elasticsearch: ElasticsearchConnectorConfig;
}

export interface TavilySearchConfig {
  apiKey?: string;
}

export interface LinkupSearchConfig {
  apiKey?: string;
}

export interface SearxngSearchConfig {
  url?: string;
}

export interface BaiduSearchConfig {
  apiKey?: string;
}

export interface SearchConfig {
  tavily: TavilySearchConfig;
  linkup: LinkupSearchConfig;
  searxng: SearxngSearchConfig;
  baidu: BaiduSearchConfig;
}

export interface OpenAIConfig {
  apiKey?: string;
}

export interface AnthropicConfig {
  apiKey?: string;
}

export interface GroqConfig {
  apiKey?: string;
}

export interface CohereConfig {
  apiKey?: string;
}

export interface LLMConfig {
  openai: OpenAIConfig;
  anthropic: AnthropicConfig;
  groq: GroqConfig;
  cohere: CohereConfig;
}

/**
 * Main configuration interface
 */
export interface AppConfig {
  port: number;
  host: string;
  database: DatabaseConfig;
  frontend: FrontendConfig;
  backend: BackendConfig;
  auth: AuthConfig;
  google: GoogleConfig;
  airtable: AirtableConfig;
  embedding: EmbeddingConfig;
  reranker: RerankerConfig;
  etl: ETLConfig;
  tts: TTSConfig;
  stt: STTConfig;
  queue: QueueConfig;
  langsmith: LangsmithConfig;
  connectors: ConnectorsConfig;
  search: SearchConfig;
  llm: LLMConfig;
}
