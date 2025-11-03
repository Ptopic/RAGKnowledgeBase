import { Injectable } from '@nestjs/common';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ConfigService } from '../config/config.service';

/**
 * Service for generating embeddings using configured embedding model.
 */
@Injectable()
export class EmbeddingService {
  private embeddingModel: OpenAIEmbeddings;

  constructor(private readonly configService: ConfigService) {
    const embeddingConfig = this.configService.embedding;

    this.embeddingModel = new OpenAIEmbeddings({
      model: embeddingConfig.model,
      // Dimensions will be automatically determined by the model
    });
  }

  /**
   * Generate embedding for a given text.
   */
  async embed(text: string): Promise<number[]> {
    return await this.embeddingModel.embedQuery(text);
  }

  /**
   * Get the embedding model instance.
   */
  getModel(): OpenAIEmbeddings {
    return this.embeddingModel;
  }
}

