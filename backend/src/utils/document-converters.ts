import { createHash } from 'crypto';
import { Logger } from '@nestjs/common';
import { token_counter, get_model_info } from 'litellm';
import { ConfigService } from '../config/config.service';
import { SUMMARY_PROMPT_TEMPLATE } from '../prompts';
import { DocumentType } from '@prisma/client';

const logger = new Logger('DocumentConverters');

export interface Chunk {
  content: string;
  embedding?: number[];
}

export interface DocumentMetadata {
  [key: string]: any;
}

/**
 * Get the total context window size for a model (input + output tokens).
 */
export async function getModelContextWindow(modelName: string): Promise<number> {
  try {
    const modelInfo = await get_model_info(modelName);
    const contextWindow = modelInfo.max_input_tokens || 4096;
    return contextWindow;
  } catch (error) {
    logger.warn(
      `Could not get model info for ${modelName}, using default 4096 tokens. Error: ${error.message}`,
    );
    return 4096;
  }
}

/**
 * Optimize content length to fit within model context window using binary search.
 */
export async function optimizeContentForContextWindow(
  content: string,
  documentMetadata: DocumentMetadata | null,
  modelName: string,
): Promise<string> {
  if (!content) {
    return content;
  }

  const contextWindow = await getModelContextWindow(modelName);
  let reservedTokens = 2000;

  if (documentMetadata) {
    const metadataText = `<DOCUMENT_METADATA>\n\n${JSON.stringify(documentMetadata)}\n\n</DOCUMENT_METADATA>`;
    const metadataTokens = await token_counter({
      messages: [{ role: 'user', content: metadataText }],
      model: modelName,
    });
    reservedTokens += metadataTokens;
  }

  const availableTokens = contextWindow - reservedTokens;

  if (availableTokens <= 100) {
    logger.warn(`Very limited tokens available for content: ${availableTokens}`);
    return content.slice(0, 500);
  }

  // Binary search to find optimal content length
  let left = 0;
  let right = content.length;
  let optimalLength = 0;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const testContent = content.slice(0, mid);
    const testDocument = `<DOCUMENT_CONTENT>\n\n${testContent}\n\n</DOCUMENT_CONTENT>`;

    const testTokens = await token_counter({
      messages: [{ role: 'user', content: testDocument }],
      model: modelName,
    });

    if (testTokens <= availableTokens) {
      optimalLength = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  const optimizedContent = optimalLength > 0 ? content.slice(0, optimalLength) : content.slice(0, 500);

  if (optimalLength < content.length) {
    logger.log(
      `Content optimized: ${content.length} -> ${optimalLength} chars to fit in ${availableTokens} available tokens`,
    );
  }

  return optimizedContent;
}

/**
 * Generate summary and embedding for document content with metadata.
 */
export async function generateDocumentSummary(
  content: string,
  userLlm: any,
  configService: ConfigService,
  documentMetadata?: DocumentMetadata,
): Promise<{ summary: string; embedding: number[] }> {
  const modelName = userLlm.model || 'gpt-3.5-turbo';

  const optimizedContent = await optimizeContentForContextWindow(
    content,
    documentMetadata,
    modelName,
  );

  const contentWithMetadata = `<DOCUMENT><DOCUMENT_METADATA>\n\n${JSON.stringify(documentMetadata)}\n\n</DOCUMENT_METADATA>\n\n<DOCUMENT_CONTENT>\n\n${optimizedContent}\n\n</DOCUMENT_CONTENT></DOCUMENT>`;

  const summaryChain = SUMMARY_PROMPT_TEMPLATE.pipe(userLlm);
  const summaryResult = await summaryChain.invoke({ document: contentWithMetadata });
  const summaryContent = summaryResult.content;

  let enhancedSummaryContent: string;

  if (documentMetadata) {
    const metadataParts = ['# DOCUMENT METADATA'];

    for (const [key, value] of Object.entries(documentMetadata)) {
      if (value) {
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        metadataParts.push(`**${formattedKey}:** ${value}`);
      }
    }

    const metadataSection = metadataParts.join('\n');
    enhancedSummaryContent = `${metadataSection}\n\n# DOCUMENT SUMMARY\n\n${summaryContent}`;
  } else {
    enhancedSummaryContent = summaryContent;
  }

  const embeddingModel = configService.getEmbeddingModelInstance();
  const summaryEmbedding = await embeddingModel.embed(enhancedSummaryContent);

  return {
    summary: enhancedSummaryContent,
    embedding: summaryEmbedding,
  };
}

/**
 * Create chunks from document content.
 */
export async function createDocumentChunks(
  content: string,
  configService: ConfigService,
): Promise<Chunk[]> {
  const chunkerInstance = configService.getChunkerInstance();
  const embeddingModel = configService.getEmbeddingModelInstance();

  const chunks = await chunkerInstance.chunk(content);

  return Promise.all(
    chunks.map(async (chunk) => ({
      content: chunk.text,
      embedding: await embeddingModel.embed(chunk.text),
    })),
  );
}

/**
 * Convert an Unstructured element to markdown format based on its category.
 */
export async function convertElementToMarkdown(element: any): Promise<string> {
  const elementCategory = element.metadata?.category;
  const content = element.page_content;

  if (!content) {
    return '';
  }

  const markdownMapping: Record<string, (x: string) => string> = {
    Formula: (x) => `\`\`\`math\n${x}\n\`\`\``,
    FigureCaption: (x) => `*Figure: ${x}*`,
    NarrativeText: (x) => `${x}\n\n`,
    ListItem: (x) => `- ${x}\n`,
    Title: (x) => `# ${x}\n\n`,
    Address: (x) => `> ${x}\n\n`,
    EmailAddress: (x) => `\`${x}\``,
    Image: (x) => `![${x}](${x})`,
    PageBreak: () => '\n---\n',
    Table: () => `\`\`\`html\n${element.metadata.text_as_html}\n\`\`\``,
    Header: (x) => `## ${x}\n\n`,
    Footer: (x) => `*${x}*\n\n`,
    CodeSnippet: (x) => `\`\`\`\n${x}\n\`\`\``,
    PageNumber: (x) => `*Page ${x}*\n\n`,
    UncategorizedText: (x) => `${x}\n\n`,
  };

  const converter = markdownMapping[elementCategory] || ((x) => x);
  return converter(content);
}

/**
 * Convert all document elements to markdown.
 */
export async function convertDocumentToMarkdown(elements: any[]): Promise<string> {
  const markdownParts: string[] = [];

  for (const element of elements) {
    const markdownText = await convertElementToMarkdown(element);
    if (markdownText) {
      markdownParts.push(markdownText);
    }
  }

  return markdownParts.join('');
}

/**
 * Convert chunks from hybrid search results to LangChain Document objects.
 */
export function convertChunksToLangChainDocuments(chunks: any[]): any[] {
  try {
    const { Document: LangChainDocument } = require('@langchain/core/documents');

    const langchainDocs = chunks.map((chunk) => {
      const content = chunk.content || '';

      const metadata: Record<string, any> = {
        chunk_id: chunk.chunk_id,
        score: chunk.score,
        rank: chunk.rank || null,
      };

      if (chunk.document) {
        const doc = chunk.document;
        metadata.document_id = doc.id;
        metadata.document_title = doc.title;
        metadata.document_type = doc.document_type;

        if (doc.metadata) {
          const docMetadata = Object.fromEntries(
            Object.entries(doc.metadata).map(([k, v]) => [`doc_meta_${k}`, v]),
          );
          Object.assign(metadata, docMetadata);

          if (doc.metadata.url) {
            metadata.source = doc.metadata.url;
          } else if (doc.metadata.sourceURL) {
            metadata.source = doc.metadata.sourceURL;
          }
        }
      }

      if (metadata.document_id) {
        metadata.source_id = metadata.document_id;
      }

      const newContent = `
        <document>
            <metadata>
                <source_id>${metadata.source_id || metadata.document_id || 'unknown'}</source_id>
            </metadata>
            <content>
                <text>
                    ${content}
                </text>
            </content>
        </document>
        `;

      return new LangChainDocument({
        pageContent: newContent,
        metadata,
      });
    });

    return langchainDocs;
  } catch (error) {
    throw new Error(
      'LangChain is not installed. Please install it with `npm install @langchain/core`',
    );
  }
}

/**
 * Generate SHA-256 hash for the given content combined with search space ID.
 */
export function generateContentHash(content: string, searchSpaceId: number): string {
  const combinedData = `${searchSpaceId}:${content}`;
  return createHash('sha256').update(combinedData, 'utf-8').digest('hex');
}

/**
 * Generate SHA-256 hash for a unique document identifier from connector sources.
 */
export function generateUniqueIdentifierHash(
  documentType: DocumentType,
  uniqueIdentifier: string | number,
  searchSpaceId: number,
): string {
  const identifierStr = String(uniqueIdentifier);
  const combinedData = `${documentType}:${identifierStr}:${searchSpaceId}`;
  return createHash('sha256').update(combinedData, 'utf-8').digest('hex');
}
