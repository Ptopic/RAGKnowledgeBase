/**
 * Tasks Module Exports
 *
 * This is the main entry point for the tasks module, providing comprehensive
 * background task processing functionality.
 *
 * Module Structure:
 * - document-processors/ - Services for processing various document types
 * - connector-indexers/ - Services for indexing content from external sources
 * - queue-tasks/ - Bull queue processors for background jobs
 * - stream-connector-search-results.service.ts - Real-time search streaming
 */

// Main module
export { TasksModule } from './tasks.module';

// Document Processors
export * from './document-processors';

// Connector Indexers
export * from './connector-indexers';

// Queue Tasks (Bull Processors)
export * from './queue-tasks';

// Stream Service
export { StreamConnectorSearchResultsService } from './stream-connector-search-results.service';
