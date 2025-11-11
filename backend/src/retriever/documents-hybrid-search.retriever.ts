import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EmbeddingService } from "./embedding.service";
import {
	DocumentSearchResult,
	SearchOptions,
} from "./interfaces/retriever.interface";

/**
 * Retriever for performing hybrid search on documents.
 * Combines vector similarity search and full-text search using Reciprocal Rank Fusion (RRF).
 * Returns individual chunks from matching documents.
 */
@Injectable()
export class DocumentHybridSearchRetriever {
	constructor(
		private readonly prisma: PrismaService,
		private readonly embeddingService: EmbeddingService,
	) {}

	/**
	 * Perform vector similarity search on documents.
	 */
	async vectorSearch(options: SearchOptions): Promise<any[]> {
		const { queryText, topK, userId, searchSpaceId } = options;

		// Get embedding for the query
		const queryEmbedding = await this.embeddingService.embed(queryText);
		const embeddingStr = `[${queryEmbedding.join(",")}]`;

		// Build WHERE clause conditions
		const conditions: string[] = ['ss."userId" = $1'];
		const params: any[] = [userId];
		let paramIndex = 2;

		if (searchSpaceId !== undefined) {
			conditions.push(`d."searchSpaceId" = $${paramIndex}`);
			params.push(searchSpaceId);
			paramIndex++;
		}

		const whereClause =
			conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

		// Raw SQL query for vector similarity search
		const query = `
      SELECT 
        d.id,
        d.title,
        d.content,
        d."documentType",
        d."documentMetadata",
        d."searchSpaceId",
        d.embedding <=> $${paramIndex}::vector as distance
      FROM "documents" d
      INNER JOIN "SearchSpace" ss ON d."searchSpaceId" = ss.id
      ${whereClause}
      ORDER BY d.embedding <=> $${paramIndex}::vector
      LIMIT $${paramIndex + 1}
    `;

		params.push(embeddingStr, topK);

		const documents = await this.prisma.$queryRawUnsafe(query, ...params);
		return documents as any[];
	}

	/**
	 * Perform full-text keyword search on documents using PostgreSQL full-text search.
	 */
	async fullTextSearch(options: SearchOptions): Promise<any[]> {
		const { queryText, topK, userId, searchSpaceId } = options;

		// Build WHERE clause conditions
		const conditions: string[] = [
			'ss."userId" = $1',
			"to_tsvector('english', d.content) @@ plainto_tsquery('english', $2)",
		];
		const params: any[] = [userId, queryText];
		let paramIndex = 3;

		if (searchSpaceId !== undefined) {
			conditions.push(`d."searchSpaceId" = $${paramIndex}`);
			params.push(searchSpaceId);
			paramIndex++;
		}

		const whereClause = `WHERE ${conditions.join(" AND ")}`;

		// Raw SQL query for full-text search
		const query = `
      SELECT 
        d.id,
        d.title,
        d.content,
        d."documentType",
        d."documentMetadata",
        d."searchSpaceId",
        ts_rank_cd(to_tsvector('english', d.content), plainto_tsquery('english', $2)) as rank
      FROM "documents" d
      INNER JOIN "SearchSpace" ss ON d."searchSpaceId" = ss.id
      ${whereClause}
      ORDER BY rank DESC
      LIMIT $${paramIndex}
    `;

		params.push(topK);

		const documents = await this.prisma.$queryRawUnsafe(query, ...params);
		return documents as any[];
	}

	/**
	 * Combine vector similarity and full-text search results using Reciprocal Rank Fusion (RRF).
	 * Returns individual chunks from matching documents.
	 */
	async hybridSearch(options: SearchOptions): Promise<DocumentSearchResult[]> {
		const { queryText, topK, userId, searchSpaceId, documentType } = options;

		// Get embedding for the query
		const queryEmbedding = await this.embeddingService.embed(queryText);
		const embeddingStr = `[${queryEmbedding.join(",")}]`;

		// Constants for RRF calculation
		const k = 60; // Constant for RRF calculation
		const nResults = topK * 2; // Get more results for better fusion

		// Build base conditions
		const conditions: string[] = ['ss."userId" = $1'];
		const params: any[] = [userId];
		let paramIndex = 2;

		if (searchSpaceId !== undefined) {
			conditions.push(`d."searchSpaceId" = $${paramIndex}`);
			params.push(searchSpaceId);
			paramIndex++;
		}

		if (documentType !== undefined) {
			conditions.push(
				`d."documentType" = $${paramIndex}::text::"DocumentType"`,
			);
			params.push(documentType);
			paramIndex++;
		}

		const baseWhere = conditions.join(" AND ");
		const semanticWhere = baseWhere;
		const keywordWhere = `${baseWhere} AND to_tsvector('english', d.content) @@ plainto_tsquery('english', $${paramIndex})`;

		// Raw SQL query using CTEs for hybrid search with RRF
		const query = `
      WITH semantic_search AS (
        SELECT 
          d.id,
          RANK() OVER (ORDER BY d.embedding <=> $${paramIndex + 1}::vector) as rank
        FROM "documents" d
        INNER JOIN "SearchSpace" ss ON d."searchSpaceId" = ss.id
        WHERE ${semanticWhere}
        ORDER BY d.embedding <=> $${paramIndex + 1}::vector
        LIMIT $${paramIndex + 2}
      ),
      keyword_search AS (
        SELECT 
          d.id,
          RANK() OVER (ORDER BY ts_rank_cd(to_tsvector('english', d.content), plainto_tsquery('english', $${paramIndex})) DESC) as rank
        FROM "documents" d
        INNER JOIN "SearchSpace" ss ON d."searchSpaceId" = ss.id
        WHERE ${keywordWhere}
        ORDER BY ts_rank_cd(to_tsvector('english', d.content), plainto_tsquery('english', $${paramIndex})) DESC
        LIMIT $${paramIndex + 2}
      )
      SELECT 
        d.id as document_id,
        d.title,
        d.content,
        d."documentType" as document_type,
        d."documentMetadata" as metadata,
        d."searchSpaceId" as search_space_id,
        (COALESCE(1.0 / (${k} + sem.rank), 0.0) + COALESCE(1.0 / (${k} + kw.rank), 0.0)) as score
      FROM semantic_search sem
      FULL OUTER JOIN keyword_search kw ON sem.id = kw.id
      INNER JOIN "documents" d ON d.id = COALESCE(sem.id, kw.id)
      ORDER BY score DESC
      LIMIT $${paramIndex + 3}
    `;

		params.push(queryText, embeddingStr, nResults, topK);

		const results = await this.prisma.$queryRawUnsafe(query, ...params);

		// For each document, fetch its chunks and return them as individual results
		const serializedResults: DocumentSearchResult[] = [];

		for (const row of results as any[]) {
			// Fetch chunks for this document
			const chunks = await this.prisma.chunk.findMany({
				where: { documentId: row.document_id },
				orderBy: { id: "asc" },
			});

			if (chunks.length > 0) {
				// Return individual chunks
				for (const chunk of chunks) {
					serializedResults.push({
						document_id: chunk.id, // Using chunk ID as document_id for consistency
						title: row.title,
						content: chunk.content,
						document_type: row.document_type,
						metadata: row.metadata,
						score: parseFloat(row.score),
						search_space_id: row.search_space_id,
					});
				}
			} else {
				// If no chunks exist, return the document content as a single result
				serializedResults.push({
					document_id: row.document_id,
					title: row.title,
					content: row.content,
					document_type: row.document_type,
					metadata: row.metadata,
					score: parseFloat(row.score),
					search_space_id: row.search_space_id,
				});
			}
		}

		return serializedResults;
	}
}
