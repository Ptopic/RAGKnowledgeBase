/**
 * Base functionality and shared imports for document processors.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Document } from '@prisma/client';

@Injectable()
export class DocumentProcessorBaseService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if a document with the given content hash already exists.
   *
   * @param contentHash - Hash of the document content
   * @returns Existing document if found, null otherwise
   */
  async checkDuplicateDocument(
    contentHash: string,
  ): Promise<Document | null> {
    return this.prisma.document.findFirst({
      where: { contentHash },
    });
  }

  /**
   * Check if a document with the given unique identifier hash already exists.
   * Eagerly loads chunks to avoid lazy loading issues during updates.
   *
   * @param uniqueIdentifierHash - Hash of the unique identifier from the source
   * @returns Existing document if found, null otherwise
   */
  async checkDocumentByUniqueIdentifier(
    uniqueIdentifierHash: string,
  ): Promise<Document | null> {
    return this.prisma.document.findFirst({
      where: { uniqueIdentifierHash },
      include: { chunks: true },
    });
  }
}
