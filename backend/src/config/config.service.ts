import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import type {
    AppConfig,
    AuthConfig,
    BackendConfig,
    ConnectorsConfig,
    DatabaseConfig,
    EmbeddingConfig,
    ETLConfig,
    FrontendConfig,
    GoogleConfig,
    LangsmithConfig,
    LLMConfig,
    QueueConfig,
    RerankerConfig,
    STTConfig,
    TTSConfig,
} from './configuration.interface';

/**
 * Type-safe configuration service wrapper
 * Provides easy access to all configuration values with proper typing
 */
@Injectable()
export class ConfigService {
  constructor(private nestConfigService: NestConfigService<AppConfig>) {}

  get port(): number {
    return this.nestConfigService.get<number>('port', { infer: true })!;
  }

  get host(): string {
    return this.nestConfigService.get<string>('host', { infer: true })!;
  }

  get database(): DatabaseConfig {
    return this.nestConfigService.get<DatabaseConfig>('database', {
      infer: true,
    })!;
  }

  get frontend(): FrontendConfig {
    return this.nestConfigService.get<FrontendConfig>('frontend', {
      infer: true,
    })!;
  }

  get backend(): BackendConfig {
    return this.nestConfigService.get<BackendConfig>('backend', {
      infer: true,
    })!;
  }

  get auth(): AuthConfig {
    return this.nestConfigService.get<AuthConfig>('auth', { infer: true })!;
  }

  get google(): GoogleConfig {
    return this.nestConfigService.get<GoogleConfig>('google', { infer: true })!;
  }

  get embedding(): EmbeddingConfig {
    return this.nestConfigService.get<EmbeddingConfig>('embedding', {
      infer: true,
    })!;
  }

  get reranker(): RerankerConfig {
    return this.nestConfigService.get<RerankerConfig>('reranker', {
      infer: true,
    })!;
  }

  get etl(): ETLConfig {
    return this.nestConfigService.get<ETLConfig>('etl', { infer: true })!;
  }

  get tts(): TTSConfig {
    return this.nestConfigService.get<TTSConfig>('tts', { infer: true })!;
  }

  get stt(): STTConfig {
    return this.nestConfigService.get<STTConfig>('stt', { infer: true })!;
  }

  get queue(): QueueConfig {
    return this.nestConfigService.get<QueueConfig>('queue', { infer: true })!;
  }

  get langsmith(): LangsmithConfig {
    return this.nestConfigService.get<LangsmithConfig>('langsmith', {
      infer: true,
    })!;
  }

  get connectors(): ConnectorsConfig {
    return this.nestConfigService.get<ConnectorsConfig>('connectors', {
      infer: true,
    })!;
  }

  get llm(): LLMConfig {
    return this.nestConfigService.get<LLMConfig>('llm', { infer: true })!;
  }

  /**
   * Get all settings as a plain object
   */
  getAllSettings(): AppConfig {
    return {
      port: this.port,
      host: this.host,
      database: this.database,
      frontend: this.frontend,
      backend: this.backend,
      auth: this.auth,
      google: this.google,
      embedding: this.embedding,
      reranker: this.reranker,
      etl: this.etl,
      tts: this.tts,
      stt: this.stt,
      queue: this.queue,
      langsmith: this.langsmith,
      connectors: this.connectors,
      llm: this.llm,
    };
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: 'reranker' | 'registration' | 'langsmith'): boolean {
    switch (feature) {
      case 'reranker':
        return this.reranker.enabled;
      case 'registration':
        return this.auth.registrationEnabled;
      case 'langsmith':
        return this.langsmith.tracingEnabled;
      default:
        return false;
    }
  }

  /**
   * Validate embedding dimension (max 2000 for pgvector)
   */
  validateEmbeddingDimension(dimension: number): void {
    if (dimension > 2000) {
      throw new Error(
        `Embedding dimension for Model: ${this.embedding.model} ` +
          `has ${dimension} dimensions, which exceeds the maximum of 2000 allowed by PGVector.`,
      );
    }
  }
}
