import { Injectable, Logger } from '@nestjs/common';

interface RerankerDocument {
	text: string;
	doc_id: string | number;
	metadata?: Record<string, any>;
}

interface RerankerResult {
	document: RerankerDocument;
	score: number;
	rank: number;
}

interface RerankerResponse {
	results: RerankerResult[];
}

/**
 * Service for reranking documents using a configured reranker
 */
@Injectable()
export class RerankerService {
	private readonly logger = new Logger(RerankerService.name);
	private rerankerInstance: any;

	constructor(rerankerInstance?: any) {
		this.rerankerInstance = rerankerInstance;
	}

	/**
	 * Set the reranker instance
	 */
	setRerankerInstance(rerankerInstance: any): void {
		this.rerankerInstance = rerankerInstance;
	}

	/**
	 * Rerank documents using the configured reranker
	 */
	rerankDocuments(
		queryText: string,
		documents: any[],
	): any[] {
		if (!this.rerankerInstance || !documents || documents.length === 0) {
			return documents;
		}

		try {
			// Create Document objects for the rerankers library
			const rerankerDocs: RerankerDocument[] = [];
			for (let i = 0; i < documents.length; i++) {
				const doc = documents[i];
				const chunkId = doc.chunk_id || `chunk_${i}`;
				const content = doc.content || '';
				const score = doc.score || 0.0;
				const documentInfo = doc.document || {};

				rerankerDocs.push({
					text: content,
					doc_id: chunkId,
					metadata: {
						document_id: documentInfo.id || '',
						document_title: documentInfo.title || '',
						document_type: documentInfo.document_type || '',
						rrf_score: score,
					},
				});
			}

			// Rerank using the configured reranker
			const rerankingResults: RerankerResponse = this.rerankerInstance.rank({
				query: queryText,
				docs: rerankerDocs,
			});

			// Process the results from the reranker
			// Convert to serializable dictionaries
			const serializedResults: any[] = [];
			for (const result of rerankingResults.results) {
				// Find the original document by id
				const originalDoc = documents.find(
					(doc) => doc.chunk_id === result.document.doc_id,
				);

				if (originalDoc) {
					// Create a new document with the reranked score
					const rerankedDoc = { ...originalDoc };
					rerankedDoc.score = result.score;
					rerankedDoc.rank = result.rank;
					serializedResults.push(rerankedDoc);
				}
			}

			return serializedResults;
		} catch (error) {
			// Log the error
			this.logger.error(`Error during reranking: ${error.message}`);
			// Fall back to original documents without reranking
			return documents;
		}
	}

	/**
	 * Get a reranker service instance from the global configuration.
	 * This method should be called with a config service instance.
	 */
	static getRerankerInstance(config: any): RerankerService | null {
		if (config?.rerankerInstance) {
			return new RerankerService(config.rerankerInstance);
		}
		return null;
	}
}
