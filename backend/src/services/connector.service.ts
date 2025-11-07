import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
	SearchSourceConnectorType,
	DocumentType,
} from '@prisma/client';
import { ChunksHybridSearchRetriever } from '../retriever/chunks-hybrid-search.retriever';
import { DocumentHybridSearchRetriever } from '../retriever/documents-hybrid-search.retriever';

export enum SearchMode {
	CHUNKS = 'CHUNKS',
	DOCUMENTS = 'DOCUMENTS',
}

interface SourceInfo {
	id: number | string;
	name: string;
	type: string;
	sources: SourceItem[];
}

interface SourceItem {
	id: number | string;
	title: string;
	description: string;
	url: string;
	[key: string]: any;
}

@Injectable()
export class ConnectorService {
	private readonly logger = new Logger(ConnectorService.name);
	private chunkRetriever: ChunksHybridSearchRetriever;
	private documentRetriever: DocumentHybridSearchRetriever;
	private userId: string | null = null;
	private sourceIdCounter: number = 100000; // High starting value to avoid collisions
	private counterLock: boolean = false;

	constructor(
		private readonly prisma: PrismaService,
		chunkRetriever: ChunksHybridSearchRetriever,
		documentRetriever: DocumentHybridSearchRetriever,
		userId?: string,
	) {
		this.chunkRetriever = chunkRetriever;
		this.documentRetriever = documentRetriever;
		this.userId = userId || null;
	}

	/**
	 * Create ConnectorService for a specific user
	 */
	static forUser(
		prisma: PrismaService,
		chunkRetriever: ChunksHybridSearchRetriever,
		documentRetriever: DocumentHybridSearchRetriever,
		userId: string,
	): ConnectorService {
		const service = new ConnectorService(
			prisma,
			chunkRetriever,
			documentRetriever,
			userId,
		);
		// Initialize counter
		service.initializeCounter().catch((error) => {
			console.error('Failed to initialize counter:', error);
		});
		return service;
	}

	/**
	 * Initialize the source_id_counter based on the total number of chunks for the user
	 */
	async initializeCounter(): Promise<void> {
		if (this.userId) {
			try {
				const chunkCount = await this.prisma.chunk.count({
					where: {
						document: {
							searchSpace: {
								userId: this.userId,
							},
						},
					},
				});
				this.sourceIdCounter = chunkCount + 1;
				console.log(
					`Initialized source_id_counter to ${this.sourceIdCounter} for user ${this.userId}`,
				);
			} catch (error) {
				console.error(`Error initializing source_id_counter: ${error.message}`);
				this.sourceIdCounter = 1;
			}
		}
	}

	/**
	 * Acquire counter lock
	 */
	private async acquireCounterLock(): Promise<void> {
		while (this.counterLock) {
			await new Promise((resolve) => setTimeout(resolve, 10));
		}
		this.counterLock = true;
	}

	/**
	 * Release counter lock
	 */
	private releaseCounterLock(): void {
		this.counterLock = false;
	}

	/**
	 * Get next source ID
	 */
	private getNextSourceId(): number {
		const id = this.sourceIdCounter;
		this.sourceIdCounter++;
		return id;
	}

	/**
	 * Transform results from document_retriever to match expected format
	 */
	private transformDocumentResults(documentResults: any[]): any[] {
		return documentResults.map((doc) => ({
			chunk_id: doc.document_id,
			document: {
				id: doc.document_id,
				title: doc.title || 'Untitled Document',
				document_type: doc.document_type,
				metadata: doc.metadata || {},
			},
			content: doc.chunks_content || doc.content || '',
			score: doc.score || 0.0,
		}));
	}

	/**
	 * Search for crawled URLs
	 */
	async searchCrawledUrls(
		userQuery: string,
		userId: string,
		searchSpaceId: number,
		topK: number = 20,
		searchMode: SearchMode = SearchMode.CHUNKS,
	): Promise<[SourceInfo, any[]]> {
		let chunks: any[];

		if (searchMode === SearchMode.CHUNKS) {
			chunks = await this.chunkRetriever.hybridSearch({
				queryText: userQuery,
				topK,
				userId,
				searchSpaceId,
				documentType: DocumentType.CRAWLED_URL,
			});
		} else {
			const docs = await this.documentRetriever.hybridSearch({
				queryText: userQuery,
				topK,
				userId,
				searchSpaceId,
				documentType: DocumentType.CRAWLED_URL,
			});
			chunks = this.transformDocumentResults(docs);
		}

		if (!chunks || chunks.length === 0) {
			return [
				{
					id: 1,
					name: 'Crawled URLs',
					type: 'CRAWLED_URL',
					sources: [],
				},
				[],
			];
		}

		const sourcesList: SourceItem[] = [];
		await this.acquireCounterLock();
		try {
			for (const chunk of chunks) {
				const document = chunk.document || {};
				const metadata = document.metadata || {};

				const source: SourceItem = {
					id: chunk.chunk_id || this.getNextSourceId(),
					title: document.title || 'Untitled Document',
					description:
						metadata.ogDescription ||
						metadata['og:description'] ||
						chunk.content ||
						'',
					url: metadata.url || '',
				};

				sourcesList.push(source);
			}
		} finally {
			this.releaseCounterLock();
		}

		return [
			{
				id: 1,
				name: 'Crawled URLs',
				type: 'CRAWLED_URL',
				sources: sourcesList,
			},
			chunks,
		];
	}

	/**
	 * Search for files
	 */
	async searchFiles(
		userQuery: string,
		userId: string,
		searchSpaceId: number,
		topK: number = 20,
		searchMode: SearchMode = SearchMode.CHUNKS,
	): Promise<[SourceInfo, any[]]> {
		let chunks: any[];

		if (searchMode === SearchMode.CHUNKS) {
			chunks = await this.chunkRetriever.hybridSearch({
				queryText: userQuery,
				topK,
				userId,
				searchSpaceId,
				documentType: DocumentType.FILE,
			});
		} else {
			const docs = await this.documentRetriever.hybridSearch({
				queryText: userQuery,
				topK,
				userId,
				searchSpaceId,
				documentType: DocumentType.FILE,
			});
			chunks = this.transformDocumentResults(docs);
		}

		if (!chunks || chunks.length === 0) {
			return [
				{
					id: 2,
					name: 'Files',
					type: 'FILE',
					sources: [],
				},
				[],
			];
		}

		const sourcesList: SourceItem[] = [];
		await this.acquireCounterLock();
		try {
			for (const chunk of chunks) {
				const document = chunk.document || {};
				const metadata = document.metadata || {};

				const source: SourceItem = {
					id: chunk.chunk_id || this.getNextSourceId(),
					title: document.title || 'Untitled Document',
					description:
						metadata.ogDescription ||
						metadata['og:description'] ||
						chunk.content ||
						'',
					url: metadata.url || '',
				};

				sourcesList.push(source);
			}
		} finally {
			this.releaseCounterLock();
		}

		return [
			{
				id: 2,
				name: 'Files',
				type: 'FILE',
				sources: sourcesList,
			},
			chunks,
		];
	}

	/**
	 * Get a connector by type for a specific user and optionally a search space
	 */
	async getConnectorByType(
		userId: string,
		connectorType: SearchSourceConnectorType,
		searchSpaceId?: number,
	): Promise<any> {
		const where: any = {
			userId,
			connectorType,
		};

		if (searchSpaceId !== undefined && searchSpaceId !== null) {
			where.searchSpaceId = searchSpaceId;
		}

		return this.prisma.searchSourceConnector.findFirst({ where });
	}

	/**
	 * Search for Slack messages
	 */
	async searchSlack(
		userQuery: string,
		userId: string,
		searchSpaceId: number,
		topK: number = 20,
		searchMode: SearchMode = SearchMode.CHUNKS,
	): Promise<[SourceInfo, any[]]> {
		let chunks: any[];

		if (searchMode === SearchMode.CHUNKS) {
			chunks = await this.chunkRetriever.hybridSearch({
				queryText: userQuery,
				topK,
				userId,
				searchSpaceId,
				documentType: DocumentType.SLACK_CONNECTOR,
			});
		} else {
			const docs = await this.documentRetriever.hybridSearch({
				queryText: userQuery,
				topK,
				userId,
				searchSpaceId,
				documentType: DocumentType.SLACK_CONNECTOR,
			});
			chunks = this.transformDocumentResults(docs);
		}

		if (!chunks || chunks.length === 0) {
			return [
				{
					id: 4,
					name: 'Slack',
					type: 'SLACK_CONNECTOR',
					sources: [],
				},
				[],
			];
		}

		const sourcesList: SourceItem[] = [];
		await this.acquireCounterLock();
		try {
			for (const chunk of chunks) {
				const document = chunk.document || {};
				const metadata = document.metadata || {};

				const channelName = metadata.channel_name || 'Unknown Channel';
				const channelId = metadata.channel_id || '';
				const messageDate = metadata.start_date || '';

				let title = `Slack: ${channelName}`;
				if (messageDate) {
					title += ` (${messageDate})`;
				}

				const url = channelId
					? `https://slack.com/app_redirect?channel=${channelId}`
					: '';

				const source: SourceItem = {
					id: chunk.chunk_id || this.getNextSourceId(),
					title,
					description: chunk.content || '',
					url,
				};

				sourcesList.push(source);
			}
		} finally {
			this.releaseCounterLock();
		}

		return [
			{
				id: 4,
				name: 'Slack',
				type: 'SLACK_CONNECTOR',
				sources: sourcesList,
			},
			chunks,
		];
	}

	/**
	 * Search for Notion pages
	 */
	async searchNotion(
		userQuery: string,
		userId: string,
		searchSpaceId: number,
		topK: number = 20,
		searchMode: SearchMode = SearchMode.CHUNKS,
	): Promise<[SourceInfo, any[]]> {
		let chunks: any[];

		if (searchMode === SearchMode.CHUNKS) {
			chunks = await this.chunkRetriever.hybridSearch({
				queryText: userQuery,
				topK,
				userId,
				searchSpaceId,
				documentType: DocumentType.NOTION_CONNECTOR,
			});
		} else {
			const docs = await this.documentRetriever.hybridSearch({
				queryText: userQuery,
				topK,
				userId,
				searchSpaceId,
				documentType: DocumentType.NOTION_CONNECTOR,
			});
			chunks = this.transformDocumentResults(docs);
		}

		if (!chunks || chunks.length === 0) {
			return [
				{
					id: 5,
					name: 'Notion',
					type: 'NOTION_CONNECTOR',
					sources: [],
				},
				[],
			];
		}

		const sourcesList: SourceItem[] = [];
		await this.acquireCounterLock();
		try {
			for (const chunk of chunks) {
				const document = chunk.document || {};
				const metadata = document.metadata || {};

				const pageTitle = metadata.page_title || 'Untitled Page';
				const pageId = metadata.page_id || '';
				const indexedAt = metadata.indexed_at || '';

				let title = `Notion: ${pageTitle}`;
				if (indexedAt) {
					title += ` (indexed: ${indexedAt})`;
				}

				let description = chunk.content || '';
				if (description.length === 100) {
					description += '...';
				}

				const url = pageId
					? `https://notion.so/${pageId.replace(/-/g, '')}`
					: '';

				const source: SourceItem = {
					id: chunk.chunk_id || this.getNextSourceId(),
					title,
					description,
					url,
				};

				sourcesList.push(source);
			}
		} finally {
			this.releaseCounterLock();
		}

		return [
			{
				id: 5,
				name: 'Notion',
				type: 'NOTION_CONNECTOR',
				sources: sourcesList,
			},
			chunks,
		];
	}

	/**
	 * Generic search method for other connector types
	 * Can be extended for: Extension, YouTube, GitHub, Linear, Jira, etc.
	 */
	async searchConnector(
		connectorId: number,
		connectorName: string,
		connectorType: DocumentType,
		userQuery: string,
		userId: string,
		searchSpaceId: number,
		topK: number = 20,
		searchMode: SearchMode = SearchMode.CHUNKS,
	): Promise<[SourceInfo, any[]]> {
		let chunks: any[];

		if (searchMode === SearchMode.CHUNKS) {
			chunks = await this.chunkRetriever.hybridSearch({
				queryText: userQuery,
				topK,
				userId,
				searchSpaceId,
				documentType: connectorType as DocumentType,
			});
		} else {
			const docs = await this.documentRetriever.hybridSearch({
				queryText: userQuery,
				topK,
				userId,
				searchSpaceId,
				documentType: connectorType as DocumentType,
			});
			chunks = this.transformDocumentResults(docs);
		}

		if (!chunks || chunks.length === 0) {
			return [
				{
					id: connectorId,
					name: connectorName,
					type: connectorType,
					sources: [],
				},
				[],
			];
		}

		const sourcesList: SourceItem[] = [];
		await this.acquireCounterLock();
		try {
			for (const chunk of chunks) {
				const document = chunk.document || {};
				const metadata = document.metadata || {};

				const source: SourceItem = {
					id: chunk.chunk_id || this.getNextSourceId(),
					title: document.title || 'Untitled Document',
					description: chunk.content || '',
					url: metadata.url || '',
				};

				sourcesList.push(source);
			}
		} finally {
			this.releaseCounterLock();
		}

		return [
			{
				id: connectorId,
				name: connectorName,
				type: connectorType,
				sources: sourcesList,
			},
			chunks,
		];
	}
}
