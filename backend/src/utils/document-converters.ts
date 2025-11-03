import { createHash } from 'crypto';
import { Logger } from '@nestjs/common';
import * as tiktoken from 'tiktoken';
import { ConfigService } from '../config/config.service';
import { SUMMARY_PROMPT_TEMPLATE } from '../prompts';
import { DocumentType } from '@prisma/client';

const logger = new Logger('DocumentConverters');

// Model context window sizes (input + output tokens)
const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
  'gpt-4-turbo': 128000,
  'gpt-4-turbo-preview': 128000,
  'gpt-4-1106-preview': 128000,
  'gpt-4-0125-preview': 128000,
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-3.5-turbo': 16385,
  'gpt-3.5-turbo-16k': 16385,
  'gpt-3.5-turbo-1106': 16385,
  'gpt-3.5-turbo-0125': 16385,
  'claude-3-opus': 200000,
  'claude-3-sonnet': 200000,
  'claude-3-haiku': 200000,
  'claude-3-5-sonnet': 200000,
};

export interface Chunk {
  content: string;
  embedding?: number[];
}

export interface DocumentMetadata {
  [key: string]: any;
}

/**
 * Count tokens in text for a given model.
 */
function countTokens(text: string, modelName: string): number {
  try {
    // Try to get encoding for the specific model
    const encoding = tiktoken.encoding_for_model(modelName as any);
    const tokens = encoding.encode(text);
    const count = tokens.length;
    encoding.free(); // Free up memory
    return count;
  } catch {
    // Fallback to cl100k_base encoding (used by gpt-4 and gpt-3.5-turbo)
    try {
      const encoding = tiktoken.get_encoding('cl100k_base');
      const tokens = encoding.encode(text);
      const count = tokens.length;
      encoding.free();
      return count;
    } catch {
      // Last resort: rough estimation (1 token ≈ 4 characters)
      logger.warn(
        `Could not load tokenizer for ${modelName}, using character-based estimation`,
      );
      return Math.ceil(text.length / 4);
    }
  }
}

/**
 * Get the total context window size for a model (input + output tokens).
 */
export function getModelContextWindow(modelName: string): number {
  // Check if model name contains any known model identifier
  for (const [key, value] of Object.entries(MODEL_CONTEXT_WINDOWS)) {
    if (modelName.includes(key)) {
      return value;
    }
  }
  
  // Default to 4096 for unknown models
  logger.warn(
    `Unknown model ${modelName}, using default 4096 token context window`,
  );
  return 4096;
}

/**
 * Optimize content length to fit within model context window using binary search.
 */
export function optimizeContentForContextWindow(
  content: string,
  documentMetadata: DocumentMetadata | null,
  modelName: string,
): string {
  if (!content) {
    return content;
  }

  const contextWindow = getModelContextWindow(modelName);
  let reservedTokens = 2000;

  if (documentMetadata) {
    const metadataText = `<DOCUMENT_METADATA>\n\n${JSON.stringify(documentMetadata)}\n\n</DOCUMENT_METADATA>`;
    const metadataTokens = countTokens(metadataText, modelName);
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

    const testTokens = countTokens(testDocument, modelName);

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

  const optimizedContent = optimizeContentForContextWindow(
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
  } catch {
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
