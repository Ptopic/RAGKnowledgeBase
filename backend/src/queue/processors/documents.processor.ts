import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from 'src/prisma/prisma.service';
import { FileProcessorsService } from 'src/tasks/document-processors';
import { QUEUE_NAMES } from '../queue.config';

/**
 * Document Processing Processor
 *
 * Handles asynchronous processing of documents:
 * - Extension documents
 * - URL documents (web scraping)
 * - YouTube video documents
 * - File uploads
 */
@Processor(QUEUE_NAMES.DOCUMENTS)
export class DocumentsProcessor {
  private readonly logger = new Logger(DocumentsProcessor.name);

  constructor(
    private prisma: PrismaService,
    private fileProcessorsService: FileProcessorsService,
  ) {}

  /**
   * Process extension document
   */
  @Process('process-extension-document')
  async processExtensionDocument(
    job: Job<{
      documentData: any;
      searchSpaceId: number;
      userId: string;
    }>,
  ) {
    const { documentData, searchSpaceId, userId } = job.data;

    try {
      this.logger.log(
        `Processing extension document for search space ${searchSpaceId}`,
      );

      // TODO: Implement document processing logic
      // This will include:
      // 1. Parse document content
      // 2. Extract text
      // 3. Chunk content
      // 4. Generate embeddings
      // 5. Store in database

      this.logger.log(`Successfully processed extension document`);
    } catch (error) {
      this.logger.error(
        `Failed to process extension document: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Process URL document (web scraping)
   */
  @Process('process-url-document')
  async processUrlDocument(
    job: Job<{
      url: string;
      searchSpaceId: number;
      userId: string;
    }>,
  ) {
    const { url, searchSpaceId, userId } = job.data;

    try {
      this.logger.log(
        `Processing URL document: ${url} for search space ${searchSpaceId}`,
      );

      // TODO: Implement URL scraping and processing
      // This will include:
      // 1. Fetch URL content (Firecrawl, Playwright, etc.)
      // 2. Extract text
      // 3. Chunk content
      // 4. Generate embeddings
      // 5. Store in database

      this.logger.log(`Successfully processed URL document: ${url}`);
    } catch (error) {
      this.logger.error(
        `Failed to process URL document ${url}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Process YouTube video document
   */
  @Process('process-youtube-document')
  async processYouTubeDocument(
    job: Job<{
      videoUrl: string;
      searchSpaceId: number;
      userId: string;
    }>,
  ) {
    const { videoUrl, searchSpaceId, userId } = job.data;

    try {
      this.logger.log(
        `Processing YouTube video: ${videoUrl} for search space ${searchSpaceId}`,
      );

      // TODO: Implement YouTube processing
      // This will include:
      // 1. Extract video ID
      // 2. Fetch transcript
      // 3. Chunk content
      // 4. Generate embeddings
      // 5. Store in database

      this.logger.log(`Successfully processed YouTube video: ${videoUrl}`);
    } catch (error) {
      this.logger.error(
        `Failed to process YouTube video ${videoUrl}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Process file upload document
   * Handles PDF, DOCX, TXT, etc.
   */
  @Process('process-file-document')
  async processFileDocument(
    job: Job<{
      filePath: string;
      fileName: string;
      searchSpaceId: number;
      userId: string;
    }>,
  ) {
    const { filePath, fileName, searchSpaceId, userId } = job.data;

    try {
      this.logger.log(
        `Processing file document: ${fileName} for search space ${searchSpaceId}`,
      );

      // Call FileProcessorsService to handle the actual file processing
      await this.fileProcessorsService.processFileInBackground(
        filePath,
        fileName,
        searchSpaceId,
        userId,
      );

      this.logger.log(`Successfully processed file document: ${fileName}`);
    } catch (error) {
      this.logger.error(
        `Failed to process file document ${fileName}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
