/**
 * URL crawler document processor.
 * Implements Jina Reader-based URL scraping (free, no API key required).
 */

import * as crypto from 'node:crypto';
import { ChatOpenAI } from '@langchain/openai';
import { Injectable, Logger } from '@nestjs/common';
import { Document, DocumentType, Log } from '@prisma/client';
import * as validator from 'validator';
import { PrismaService } from '../../prisma/prisma.service';
import { SUMMARY_PROMPT_TEMPLATE } from '../../prompts';
import { EmbeddingService } from '../../retriever/embedding.service';
import { ImageAnalysisService } from '../../services/image-analysis.service';
import { JinaReaderService } from '../../services/jina-reader.service';
import { TaskLoggingService } from '../../services/task-logging.service';
import { optimizeContentForContextWindow } from '../../utils/document-converters';
import {
  chunkMarkdownContent,
  createMarkdownAwareSplitter,
} from '../../utils/chunking';
import { extractImageCandidatesFromMarkdown } from '../../utils/image-markdown';
import { DocumentProcessorBaseService } from './base.service';

@Injectable()
export class UrlCrawlerService {
  private readonly logger = new Logger(UrlCrawlerService.name);
  private readonly textSplitter = createMarkdownAwareSplitter();

  constructor(
    private prisma: PrismaService,
    private baseService: DocumentProcessorBaseService,
    private embeddingService: EmbeddingService,
    private jinaReaderService: JinaReaderService,
    private imageAnalysisService: ImageAnalysisService,
  ) {}

  /**
   * Create document chunks with embeddings.
   */
  private async createDocumentChunks(
    content: string,
  ): Promise<{ content: string; embedding: number[] }[]> {
    const chunks = await chunkMarkdownContent(content, this.textSplitter, 'web');
    const avgChunkChars =
      chunks.length > 0
        ? Math.round(chunks.reduce((acc, chunk) => acc + chunk.length, 0) / chunks.length)
        : 0;
    const tinyChunkCount = chunks.filter((chunk) => chunk.length < 120).length;
    this.logger.debug(
      `Chunking stats[url]: raw=${content.length} chunks=${chunks.length} avg=${avgChunkChars} tiny=${tinyChunkCount}`,
    );

    return Promise.all(
      chunks.map(async (chunkText) => ({
        content: chunkText,
        embedding: await this.embeddingService.embed(chunkText),
      })),
    );
  }

  /**
   * Generate document summary with metadata using AI (GPT-4o).
   * Uses the same approach as the Python backend for consistency.
   */
  private async generateDocumentSummary(
    content: string,
    // biome-ignore lint/suspicious/noExplicitAny: Metadata can have any shape
    metadata: Record<string, any>,
  ): Promise<{ summaryContent: string; summaryEmbedding: number[] }> {
    try {
      // Always use GPT-4o for document summaries (high quality, large context window)
      const modelName = 'gpt-4o';
      const llm = new ChatOpenAI({
        modelName,
        temperature: 0.3, // Slightly creative but mostly factual
        openAIApiKey: process.env.OPENAI_API_KEY,
      });

      // Optimize content to fit within context window
      const optimizedContent = optimizeContentForContextWindow(
        content,
        metadata,
        modelName,
      );

      // Prepare document with metadata for LLM
      const contentWithMetadata = `<DOCUMENT><DOCUMENT_METADATA>\n\n${JSON.stringify(metadata, null, 2)}\n\n</DOCUMENT_METADATA>\n\n<DOCUMENT_CONTENT>\n\n${optimizedContent}\n\n</DOCUMENT_CONTENT></DOCUMENT>`;

      // Generate summary using LLM
      this.logger.log(
        `Generating AI summary for URL document with ${optimizedContent.length} characters`,
      );
      const summaryChain = SUMMARY_PROMPT_TEMPLATE.pipe(llm);
      const summaryResult = await summaryChain.invoke({
        document: contentWithMetadata,
      });

      // Extract summary content from result
      const summaryContent =
        typeof summaryResult === 'string'
          ? summaryResult
          : (summaryResult as { content?: string }).content ||
            String(summaryResult);

      // Enhance summary with metadata section
      const metadataParts = ['# DOCUMENT METADATA'];

      for (const [key, value] of Object.entries(metadata)) {
        if (value) {
          const formattedKey = key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());
          metadataParts.push(`**${formattedKey}:** ${value}`);
        }
      }

      const metadataSection = metadataParts.join('\n');
      const enhancedSummaryContent = `${metadataSection}\n\n# DOCUMENT SUMMARY\n\n${summaryContent}`;

      // Generate embedding for the enhanced summary
      this.logger.log('Generating embedding for URL document summary');
      const summaryEmbedding = await this.embeddingService.embed(
        enhancedSummaryContent,
      );

      return { summaryContent: enhancedSummaryContent, summaryEmbedding };
    } catch (error) {
      this.logger.error(
        `Failed to generate AI summary, falling back to simple summary: ${error.message}`,
      );

      // Fallback to simple summary if AI generation fails
      const metadataParts: string[] = ['# DOCUMENT METADATA'];

      for (const [key, value] of Object.entries(metadata)) {
        if (value) {
          const formattedKey = key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());
          metadataParts.push(`**${formattedKey}:** ${value}`);
        }
      }

      const metadataSection = metadataParts.join('\n');
      const summaryContent = `${metadataSection}\n\n# DOCUMENT SUMMARY\n\n${content.substring(0, 5000)}`;

      // Generate embedding for the fallback summary
      const summaryEmbedding =
        await this.embeddingService.embed(summaryContent);

      return { summaryContent, summaryEmbedding };
    }
  }

  /**
   * Process and store a document from a crawled URL.
   * Uses Jina Reader API (free, no API key required).
   *
   * @param url - URL to crawl
   * @param searchSpaceId - ID of the search space
   * @param userId - ID of the user
   * @returns Document object if successful, null if failed
   */
  async addCrawledUrlDocument(
    url: string,
    searchSpaceId: number,
    userId: string,
  ): Promise<Document | null> {
    const taskLogger = TaskLoggingService.forSearchSpace(
      this.prisma,
      searchSpaceId,
    );

    // Log task start
    const logEntry: Log = await taskLogger.logTaskStart(
      'crawl_url_document',
      'background_task',
      `Starting URL crawling process for: ${url}`,
      { url, user_id: userId },
    );

    try {
      // URL validation step
      await taskLogger.logTaskProgress(
        logEntry,
        `Validating URL: ${url}`,
        { stage: 'validation' },
      );

      if (!validator.isURL(url)) {
        throw new Error(`URL ${url} is not a valid URL address`);
      }

      // Set up crawler
      await taskLogger.logTaskProgress(
        logEntry,
        `Setting up crawler for URL: ${url}`,
        {
          stage: 'crawler_setup',
          jina_reader_available: this.jinaReaderService.isAvailable(),
        },
      );

      let contentInMarkdown: string;
      // biome-ignore lint/suspicious/noExplicitAny: Metadata can have any shape
      let crawledMetadata: Record<string, any>;

      if (this.jinaReaderService.isAvailable()) {
        // Use Jina Reader (free, no API key required)
        await taskLogger.logTaskProgress(
          logEntry,
          `Crawling URL content with Jina Reader: ${url}`,
          { stage: 'crawling', crawler_type: 'Jina Reader' },
        );

        const scrapeResult = await this.jinaReaderService.scrapeUrl(url);
        contentInMarkdown = scrapeResult.content;
        crawledMetadata = scrapeResult.metadata;
      } else {
        // Fallback: No crawler available
        throw new Error(
          'Jina Reader service is not available. Please enable JINA_READER_ENABLED in .env',
        );
      }

      // Format document
      await taskLogger.logTaskProgress(
        logEntry,
        `Processing crawled content from: ${url}`,
        { stage: 'content_processing', content_length: contentInMarkdown.length },
      );

      // Format document metadata in a more maintainable way (same as Python)
      const metadataSections: [string, string[]][] = [
        [
          'METADATA',
          Object.entries(crawledMetadata).map(
            ([key, value]) => `${key.toUpperCase()}: ${value}`,
          ),
        ],
        [
          'CONTENT',
          ['FORMAT: markdown', 'TEXT_START', contentInMarkdown, 'TEXT_END'],
        ],
      ];

      // Build the document string more efficiently (same as Python)
      const documentParts: string[] = [];
      documentParts.push('<DOCUMENT>');

      for (const [sectionTitle, sectionContent] of metadataSections) {
        documentParts.push(`<${sectionTitle}>`);
        documentParts.push(...sectionContent);
        documentParts.push(`</${sectionTitle}>`);
      }

      documentParts.push('</DOCUMENT>');
      const combinedDocumentString = documentParts.join('\n');

      // Generate unique identifier hash for this URL
      const uniqueIdentifierHash = this.generateUniqueIdentifierHash(
        DocumentType.CRAWLED_URL,
        url,
        searchSpaceId,
      );

      // Generate content hash
      const contentHash = this.generateContentHash(
        combinedDocumentString,
        searchSpaceId,
      );

      // Check if document with this unique identifier already exists
      await taskLogger.logTaskProgress(
        logEntry,
        `Checking for existing URL: ${url}`,
        { stage: 'duplicate_check', url },
      );

      const existingDocument =
        await this.baseService.checkDocumentByUniqueIdentifier(
          uniqueIdentifierHash,
        );

      if (existingDocument) {
        // Document exists - check if content has changed
        if (existingDocument.contentHash === contentHash) {
          await taskLogger.logTaskSuccess(
            logEntry,
            `URL document unchanged: ${url}`,
            {
              duplicate_detected: true,
              existing_document_id: existingDocument.id,
            },
          );
          this.logger.log(`Document for URL ${url} unchanged. Skipping.`);
          return existingDocument;
        }
        // Content has changed - update the existing document
        this.logger.log(`Content changed for URL ${url}. Updating document.`);
        await taskLogger.logTaskProgress(
          logEntry,
          `Updating URL document: ${url}`,
          { stage: 'document_update', url },
        );
      }

      // Generate summary
      await taskLogger.logTaskProgress(
        logEntry,
        `Generating summary for URL content: ${url}`,
        { stage: 'summary_generation' },
      );

      // Generate summary with metadata
      const documentMetadata = {
        url,
        title: crawledMetadata.title || url,
        document_type: 'Crawled URL Document',
        crawler_type: 'Jina Reader',
      };

      const { summaryContent, summaryEmbedding } =
        await this.generateDocumentSummary(
          combinedDocumentString,
          documentMetadata,
        );

      // Process chunks
      await taskLogger.logTaskProgress(
        logEntry,
        `Processing content chunks for URL: ${url}`,
        { stage: 'chunk_processing' },
      );

      const chunks = await this.createDocumentChunks(contentInMarkdown);

      // Update or create document
      let document: Document;
      if (existingDocument) {
        // Delete old chunks first
        await this.prisma.chunk.deleteMany({
          where: { documentId: existingDocument.id },
        });

        // Update existing document
        await taskLogger.logTaskProgress(
          logEntry,
          `Updating document in database for URL: ${url}`,
          { stage: 'document_update', chunks_count: chunks.length },
        );

        document = await this.prisma.document.update({
          where: { id: existingDocument.id },
          data: {
            title: crawledMetadata.title || url,
            content: summaryContent,
            contentHash,
            documentMetadata: crawledMetadata as any,
          },
          include: { chunks: true },
        });

        // Update document embedding using raw SQL
        await this.updateDocumentEmbedding(document.id, summaryEmbedding);

        // Insert chunks with embeddings using raw SQL
        await this.insertChunksWithEmbeddings(document.id, chunks);
        await this.enqueueImageAnalysisJob(
          document.id,
          searchSpaceId,
          contentInMarkdown,
          'web',
        );
      } else {
        // Create new document
        await taskLogger.logTaskProgress(
          logEntry,
          `Creating document in database for URL: ${url}`,
          { stage: 'document_creation', chunks_count: chunks.length },
        );

        document = await this.prisma.document.create({
          data: {
            searchSpaceId,
            title: crawledMetadata.title || url,
            documentType: DocumentType.CRAWLED_URL,
            documentMetadata: crawledMetadata as any,
            content: summaryContent,
            contentHash,
            uniqueIdentifierHash,
          },
          include: { chunks: true },
        });

        // Update document embedding using raw SQL
        await this.updateDocumentEmbedding(document.id, summaryEmbedding);

        // Insert chunks with embeddings using raw SQL
        await this.insertChunksWithEmbeddings(document.id, chunks);
        await this.enqueueImageAnalysisJob(
          document.id,
          searchSpaceId,
          contentInMarkdown,
          'web',
        );
      }

      // Log success
      await taskLogger.logTaskSuccess(
        logEntry,
        `Successfully crawled and processed URL: ${url}`,
        {
          document_id: document.id,
          title: document.title,
          content_hash: contentHash,
          chunks_count: chunks.length,
          summary_length: summaryContent.length,
        },
      );

      return document;
    } catch (error) {
      await taskLogger.logTaskFailure(
        logEntry,
        `Failed to crawl URL: ${url}`,
        error.message,
        { error_type: error.name },
      );

      this.logger.error(
        `Failed to crawl URL: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to crawl URL: ${error.message}`);
    }
  }

  private async enqueueImageAnalysisJob(
    documentId: number,
    searchSpaceId: number,
    markdown: string,
    sourceType: 'file' | 'web' | 'markdown' | 'youtube',
  ): Promise<void> {
    try {
      const images = extractImageCandidatesFromMarkdown(markdown);
      if (images.length === 0) return;

      await this.imageAnalysisService.analyzeDocumentImages({
        documentId,
        searchSpaceId,
        sourceType,
        images,
      });
    } catch (error) {
      this.logger.warn(`Failed to enqueue image analysis: ${error.message}`);
    }
  }

  private generateUniqueIdentifierHash(
    documentType: DocumentType,
    identifier: string,
    searchSpaceId: number,
  ): string {
    const hashInput = `${documentType}-${identifier}-${searchSpaceId}`;
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  private generateContentHash(content: string, searchSpaceId: number): string {
    const hashInput = `${content}-${searchSpaceId}`;
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Helper method to insert chunks with embeddings using raw SQL.
   * Since embedding is Unsupported("vector") in Prisma, we can't use it in standard operations.
   */
  private async insertChunksWithEmbeddings(
    documentId: number,
    chunks: { content: string; embedding: number[] }[],
  ): Promise<void> {
    for (const chunk of chunks) {
      // Convert embedding array to PostgreSQL vector format
      const vectorString = `[${chunk.embedding.join(',')}]`;

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO chunks (content, embedding, document_id, created_at)
         VALUES ($1, $2::vector, $3, NOW())`,
        chunk.content,
        vectorString,
        documentId,
      );
    }
  }

  /**
   * Helper method to update document embedding using raw SQL.
   * Since embedding is Unsupported("vector") in Prisma, we can't use it in standard operations.
   */
  private async updateDocumentEmbedding(
    documentId: number,
    embedding: number[],
  ): Promise<void> {
    // Convert embedding array to PostgreSQL vector format
    const vectorString = `[${embedding.join(',')}]`;

    await this.prisma.$executeRawUnsafe(
      `UPDATE documents SET embedding = $1::vector WHERE id = $2`,
      vectorString,
      documentId,
    );
  }
}
