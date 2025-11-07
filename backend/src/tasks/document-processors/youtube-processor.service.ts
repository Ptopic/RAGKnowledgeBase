/**
 * YouTube video document processor.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Document, DocumentType } from '@prisma/client';
import { DocumentProcessorBaseService } from './base.service';

@Injectable()
export class YoutubeProcessorService {
  private readonly logger = new Logger(YoutubeProcessorService.name);

  constructor(
    private prisma: PrismaService,
    private baseService: DocumentProcessorBaseService,
  ) {}

  /**
   * Extract video ID from various YouTube URL formats.
   *
   * @param url - YouTube URL
   * @returns Video ID if found, null otherwise
   */
  private getYoutubeVideoId(url: string): string | null {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;

      if (hostname === 'youtu.be') {
        return parsedUrl.pathname.substring(1);
      }
      if (hostname === 'www.youtube.com' || hostname === 'youtube.com') {
        if (parsedUrl.pathname === '/watch') {
          return parsedUrl.searchParams.get('v');
        }
        if (parsedUrl.pathname.startsWith('/embed/')) {
          return parsedUrl.pathname.split('/')[2];
        }
        if (parsedUrl.pathname.startsWith('/v/')) {
          return parsedUrl.pathname.split('/')[2];
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Process a YouTube video URL, extract transcripts, and store as a document.
   *
   * @param url - YouTube video URL
   * @param searchSpaceId - ID of the search space
   * @param userId - ID of the user
   * @returns The created document object
   */
  async addYoutubeVideoDocument(
    url: string,
    searchSpaceId: number,
    userId: string,
  ): Promise<Document> {
    try {
      // Extract video ID from URL
      const videoId = this.getYoutubeVideoId(url);
      if (!videoId) {
        throw new Error(`Could not extract video ID from URL: ${url}`);
      }

      // Note: Video metadata fetching would be done here
      const videoData = {
        title: 'YouTube Video',
        author_name: 'Unknown',
        thumbnail_url: '',
      };

      // Note: Transcript fetching would be done here using youtube-transcript-api
      const transcriptText = 'No captions available for this video.';

      // Format document metadata
      const metadataSections: [string, string[]][] = [
        [
          'METADATA',
          [
            `TITLE: ${videoData.title}`,
            `URL: ${url}`,
            `VIDEO_ID: ${videoId}`,
            `AUTHOR: ${videoData.author_name}`,
            `THUMBNAIL: ${videoData.thumbnail_url}`,
          ],
        ],
        [
          'CONTENT',
          ['FORMAT: transcript', 'TEXT_START', transcriptText, 'TEXT_END'],
        ],
      ];

      // Build the document string
      const documentParts: string[] = [];
      documentParts.push('<DOCUMENT>');

      for (const [sectionTitle, sectionContent] of metadataSections) {
        documentParts.push(`<${sectionTitle}>`);
        documentParts.push(...sectionContent);
        documentParts.push(`</${sectionTitle}>`);
      }

      documentParts.push('</DOCUMENT>');
      const combinedDocumentString = documentParts.join('\n');

      // Generate unique identifier hash for this YouTube video
      const uniqueIdentifierHash = this.generateUniqueIdentifierHash(
        DocumentType.YOUTUBE_VIDEO,
        videoId,
        searchSpaceId,
      );

      // Generate content hash
      const contentHash = this.generateContentHash(
        combinedDocumentString,
        searchSpaceId,
      );

      // Check if document with this unique identifier already exists
      const existingDocument =
        await this.baseService.checkDocumentByUniqueIdentifier(
          uniqueIdentifierHash,
        );

      if (existingDocument) {
        // Document exists - check if content has changed
        if (existingDocument.contentHash === contentHash) {
          this.logger.log(
            `Document for YouTube video ${videoId} unchanged. Skipping.`,
          );
          return existingDocument;
        } else {
          // Content has changed - update the existing document
          this.logger.log(
            `Content changed for YouTube video ${videoId}. Updating document.`,
          );
        }
      }

      // Note: LLM service integration would be done here
      const summaryContent = combinedDocumentString;
      const summaryEmbedding: number[] = [];

      // Update or create document
      if (existingDocument) {
        // Update existing document
        const updatedDocument = await this.prisma.document.update({
          where: { id: existingDocument.id },
          data: {
            title: videoData.title,
            content: summaryContent,
            contentHash,
            embedding: summaryEmbedding,
            documentMetadata: {
              url,
              video_id: videoId,
              video_title: videoData.title,
              author: videoData.author_name,
              thumbnail: videoData.thumbnail_url,
            } as any,
          },
        });
        return updatedDocument;
      } else {
        // Create new document
        const document = await this.prisma.document.create({
          data: {
            title: videoData.title,
            documentType: DocumentType.YOUTUBE_VIDEO,
            documentMetadata: {
              url,
              video_id: videoId,
              video_title: videoData.title,
              author: videoData.author_name,
              thumbnail: videoData.thumbnail_url,
            } as any,
            content: summaryContent,
            embedding: summaryEmbedding,
            searchSpaceId,
            contentHash,
            uniqueIdentifierHash,
          },
        });
        return document;
      }
    } catch (error) {
      this.logger.error(
        `Failed to process YouTube video: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private generateUniqueIdentifierHash(
    documentType: DocumentType,
    identifier: string,
    searchSpaceId: number,
  ): string {
    const crypto = require('crypto');
    const hashInput = `${documentType}-${identifier}-${searchSpaceId}`;
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  private generateContentHash(content: string, searchSpaceId: number): string {
    const crypto = require('crypto');
    const hashInput = `${content}-${searchSpaceId}`;
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }
}
