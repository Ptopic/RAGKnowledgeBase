import { Injectable, Logger } from "@nestjs/common";
import { Document } from "../utils/agent.utils";

/**
 * Reranker types supported
 */
export enum RerankerType {
	NONE = "none",
	SIMPLE = "simple",
	JINA = "jina",
}

/**
 * Reranker configuration
 */
interface RerankerConfig {
	type: RerankerType;
	apiKey?: string;
	model?: string;
	apiBase?: string;
}

/**
 * Production-grade reranker service
 * Supports multiple reranking providers:
 * - Simple (term frequency - default)
 * - Jina Rerank API
 */
@Injectable()
export class RerankerService {
	private readonly logger = new Logger(RerankerService.name);
	private config: RerankerConfig;

	constructor() {
		// Initialize with environment-based configuration
		this.config = this.loadConfigFromEnv();
		this.logger.log(`Reranker initialized with type: ${this.config.type}`);
	}

	/**
	 * Load reranker configuration from environment variables
	 */
	private loadConfigFromEnv(): RerankerConfig {
		const type =
			(process.env.RERANKER_TYPE as RerankerType) || RerankerType.SIMPLE;
		const apiKey = process.env.RERANKER_API_KEY;
		const model = process.env.RERANKER_MODEL;
		const apiBase = process.env.RERANKER_API_BASE;

		return {
			type,
			apiKey,
			model,
			apiBase,
		};
	}

	/**
	 * Set reranker configuration programmatically
	 */
	setConfig(config: Partial<RerankerConfig>): void {
		this.config = { ...this.config, ...config };
		this.logger.log(`Reranker configuration updated: ${this.config.type}`);
	}

	/**
	 * Main rerank method - routes to appropriate reranker
	 */
	async rerankDocuments(
		queryText: string,
		documents: Document[],
	): Promise<Document[]> {
		if (!documents || documents.length === 0) {
			this.logger.debug("No documents provided for reranking");
			return documents;
		}

		if (this.config.type === RerankerType.NONE) {
			this.logger.debug("Reranking disabled, returning original order");
			return documents;
		}

		try {
			this.logger.log(
				`Reranking ${documents.length} documents using ${this.config.type} reranker for query: "${queryText.substring(0, 100)}..."`,
			);

			let rerankedDocs: Document[];

			switch (this.config.type) {
				case RerankerType.JINA:
					rerankedDocs = await this.rerankWithJina(queryText, documents);
					break;

				default:
					rerankedDocs = await this.rerankSimple(queryText, documents);
					break;
			}

			this.logger.log(`Successfully reranked ${rerankedDocs.length} documents`);
			return rerankedDocs;
		} catch (error) {
			this.logger.error(
				`Error during reranking with ${this.config.type}: ${error.message}`,
				error.stack,
			);
			// Fall back to original documents
			return documents;
		}
	}

	/**
	 * Jina Rerank API
	 * https://jina.ai/reranker/
	 */
	private async rerankWithJina(
		queryText: string,
		documents: Document[],
	): Promise<Document[]> {
		if (!this.config.apiKey) {
			this.logger.warn(
				"Jina API key not configured, falling back to simple reranking",
			);
			return this.rerankSimple(queryText, documents);
		}

		try {
			const model = this.config.model || "jina-reranker-v2-multilingual";
			const apiBase = this.config.apiBase || "https://api.jina.ai/v1";

			// Prepare documents for Jina
			const jinaDocuments = documents.map((doc) => ({
				text: doc.content,
			}));

			// Call Jina Rerank API
			const response = await fetch(`${apiBase}/rerank`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.config.apiKey}`,
				},
				body: JSON.stringify({
					model,
					query: queryText,
					documents: jinaDocuments,
					top_n: documents.length,
				}),
			});

			if (!response.ok) {
				throw new Error(`Jina API error: ${response.statusText}`);
			}

			const data = await response.json();

			// Map results back to documents with scores
			const rerankedDocs = data.results.map((result: any) => {
				const doc = documents[result.index];
				return {
					...doc,
					score: result.relevance_score,
					rank: result.index + 1,
				};
			});

			// Sort by score descending
			rerankedDocs.sort((a, b) => (b.score || 0) - (a.score || 0));

			// Update ranks
			rerankedDocs.forEach((doc, index) => {
				doc.rank = index + 1;
			});

			this.logger.log(
				`Jina AI reranked ${rerankedDocs.length} documents (model: ${model})`,
			);

			return rerankedDocs;
		} catch (error) {
			this.logger.error(
				`Jina AI reranking failed: ${error.message}`,
				error.stack,
			);
			return this.rerankSimple(queryText, documents);
		}
	}

	/**
	 * Simple term frequency-based reranking (fallback)
	 */
	private async rerankSimple(
		queryText: string,
		documents: Document[],
	): Promise<Document[]> {
		this.logger.debug("Using simple term frequency reranking");

		const rerankedDocs = documents.map((doc, index) => {
			const score = this.calculateSimpleRelevanceScore(queryText, doc.content);

			return {
				...doc,
				score,
				rank: index,
			};
		});

		// Sort by score descending
		rerankedDocs.sort((a, b) => (b.score || 0) - (a.score || 0));

		// Update ranks after sorting
		rerankedDocs.forEach((doc, index) => {
			doc.rank = index + 1;
		});

		return rerankedDocs;
	}

	/**
	 * Calculate simple relevance score based on query term frequency
	 */
	private calculateSimpleRelevanceScore(
		query: string,
		content: string,
	): number {
		if (!content) return 0;

		const queryLower = query.toLowerCase();
		const contentLower = content.toLowerCase();

		// Tokenize query
		const queryTerms = queryLower
			.split(/\s+/)
			.filter((term) => term.length > 2);

		// Calculate term frequency in content
		let score = 0;
		for (const term of queryTerms) {
			const termCount = (contentLower.match(new RegExp(term, "g")) || [])
				.length;
			score += termCount;
		}

		// Normalize by content length
		const normalizedScore = score / (contentLower.length / 1000);

		return normalizedScore;
	}

	/**
	 * Check if reranking is enabled
	 */
	isRerankerEnabled(): boolean {
		return this.config.type !== RerankerType.NONE;
	}

	/**
	 * Get current reranker type
	 */
	getRerankerType(): RerankerType {
		return this.config.type;
	}
}
