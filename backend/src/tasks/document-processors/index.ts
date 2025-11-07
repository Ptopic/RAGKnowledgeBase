/**
 * Document processors module for background tasks.
 *
 * This module provides a collection of document processors for different content types
 * and sources. Each processor is responsible for handling a specific type of document
 * processing task in the background.
 *
 * Available processors:
 * - URL crawler: Process web pages from URLs
 * - Extension processor: Handle documents from browser extension
 * - Markdown processor: Process markdown files
 * - File processors: Handle files using different ETL services (Unstructured, LlamaCloud, Docling)
 * - YouTube processor: Process YouTube videos and extract transcripts
 */

export { DocumentProcessorBaseService } from './base.service';
export { ExtensionProcessorService } from './extension-processor.service';
export { UrlCrawlerService } from './url-crawler.service';
export { YoutubeProcessorService } from './youtube-processor.service';
export { MarkdownProcessorService } from './markdown-processor.service';
export { FileProcessorsService } from './file-processors.service';
