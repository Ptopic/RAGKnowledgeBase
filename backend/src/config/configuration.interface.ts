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

export interface JinaReaderConfig {
	enabled: boolean;
	apiKey?: string;
	fallback: JinaReaderFallbackConfig;
	proxy: JinaReaderProxyConfig;
}

export interface JinaReaderFallbackConfig {
	enabled: boolean;
	timeoutMs: number;
	impitBrowser: string;
	http3: boolean;
}

export interface JinaReaderProxyConfig {
	enabled: boolean;
	protocol: "http" | "https";
	host?: string;
	port?: number;
	username?: string;
	password?: string;
	checkIpOnEachRequest: boolean;
}

export interface ETLConfig {
	service: "LLAMACLOUD" | "DOCLING";
	unstructured: UnstructuredConfig;
	llamaCloud: LlamaCloudConfig;
	jinaReader: JinaReaderConfig;
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

export interface ConnectorsConfig {
	github: GithubConnectorConfig;
	slack: SlackConnectorConfig;
	notion: NotionConnectorConfig;
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

export interface EncryptionConfig {
  apiKey?: string;
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
  embedding: EmbeddingConfig;
  reranker: RerankerConfig;
  etl: ETLConfig;
  tts: TTSConfig;
  stt: STTConfig;
  queue: QueueConfig;
  langsmith: LangsmithConfig;
  connectors: ConnectorsConfig;
  llm: LLMConfig;
  encryption: EncryptionConfig;
}
