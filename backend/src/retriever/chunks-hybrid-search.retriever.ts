import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';
import { ChunkSearchResult, SearchOptions } from './interfaces/retriever.interface';

/**
 * Retriever for performing hybrid search on document chunks.
 * Combines vector similarity search and full-text search using Reciprocal Rank Fusion (RRF).
 */
@Injectable()
export class ChunksHybridSearchRetriever {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Perform vector similarity search on chunks.
   */
  async vectorSearch(options: SearchOptions): Promise<any[]> {
    const { queryText, topK, userId, searchSpaceId } = options;

    // Get embedding for the query
    const queryEmbedding = await this.embeddingService.embed(queryText);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Build WHERE clause conditions
    const conditions: string[] = ['ss."user_id" = $1'];
    const params: any[] = [userId];
    let paramIndex = 2;

    if (searchSpaceId !== undefined) {
      conditions.push(`d."search_space_id" = $${paramIndex}`);
      params.push(searchSpaceId);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Raw SQL query for vector similarity search
    const query = `
      SELECT
        c.id,
        c.content,
        c.embedding,
        c."document_id",
        d.id as "document_id",
        d.title as "document_title",
        d."document_type" as "document_type",
        d."document_metadata" as "document_metadata",
        c.embedding <=> $${paramIndex}::vector as distance
      FROM chunks c
      INNER JOIN documents d ON c."document_id" = d.id
      INNER JOIN searchspaces ss ON d."search_space_id" = ss.id
      ${whereClause}
      ORDER BY c.embedding <=> $${paramIndex}::vector
      LIMIT $${paramIndex + 1}
    `;

    params.push(embeddingStr, topK);

    const chunks = await this.prisma.$queryRawUnsafe(query, ...params);
    return chunks as any[];
  }

  /**
   * Perform full-text keyword search on chunks using PostgreSQL full-text search.
   */
  async fullTextSearch(options: SearchOptions): Promise<any[]> {
    const { queryText, topK, userId, searchSpaceId } = options;

    // Build WHERE clause conditions
    const conditions: string[] = [
      'ss."user_id" = $1',
      "to_tsvector('english', c.content) @@ plainto_tsquery('english', $2)",
    ];
    const params: any[] = [userId, queryText];
    let paramIndex = 3;

    if (searchSpaceId !== undefined) {
      conditions.push(`d."search_space_id" = $${paramIndex}`);
      params.push(searchSpaceId);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Raw SQL query for full-text search
    const query = `
      SELECT
        c.id,
        c.content,
        c."document_id",
        d.id as "document_id",
        d.title as "document_title",
        d."document_type" as "document_type",
        d."document_metadata" as "document_metadata",
        ts_rank_cd(to_tsvector('english', c.content), plainto_tsquery('english', $2)) as rank
      FROM chunks c
      INNER JOIN documents d ON c."document_id" = d.id
      INNER JOIN searchspaces ss ON d."search_space_id" = ss.id
      ${whereClause}
      ORDER BY rank DESC
      LIMIT $${paramIndex}
    `;

    params.push(topK);

    const chunks = await this.prisma.$queryRawUnsafe(query, ...params);
    return chunks as any[];
  }

  /**
   * Combine vector similarity and full-text search results using Reciprocal Rank Fusion (RRF).
   */
  async hybridSearch(options: SearchOptions): Promise<ChunkSearchResult[]> {
    const { queryText, topK, userId, searchSpaceId, documentType } = options;

    // Get embedding for the query
    const queryEmbedding = await this.embeddingService.embed(queryText);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Constants for RRF calculation
    const k = 60; // Constant for RRF calculation
    const nResults = topK * 2; // Get more results for better fusion

    // Build base conditions
    const conditions: string[] = ['ss."user_id" = $1'];
    const params: any[] = [userId];
    let paramIndex = 2;

    if (searchSpaceId !== undefined) {
      conditions.push(`d."search_space_id" = $${paramIndex}`);
      params.push(searchSpaceId);
      paramIndex++;
    }

    if (documentType !== undefined) {
      conditions.push(`d."document_type" = $${paramIndex}::text::"DocumentType"`);
      params.push(documentType);
      paramIndex++;
    }

    const baseWhere = conditions.join(' AND ');
    const semanticWhere = baseWhere;
    const keywordWhere = `${baseWhere} AND to_tsvector('english', c.content) @@ plainto_tsquery('english', $${paramIndex})`;

    // Raw SQL query using CTEs for hybrid search with RRF
    const query = `
      WITH semantic_search AS (
        SELECT
          c.id,
          RANK() OVER (ORDER BY c.embedding <=> $${paramIndex + 1}::vector) as rank
        FROM chunks c
        INNER JOIN documents d ON c."document_id" = d.id
        INNER JOIN searchspaces ss ON d."search_space_id" = ss.id
        WHERE ${semanticWhere}
        ORDER BY c.embedding <=> $${paramIndex + 1}::vector
        LIMIT $${paramIndex + 2}
      ),
      keyword_search AS (
        SELECT
          c.id,
          RANK() OVER (ORDER BY ts_rank_cd(to_tsvector('english', c.content), plainto_tsquery('english', $${paramIndex})) DESC) as rank
        FROM chunks c
        INNER JOIN documents d ON c."document_id" = d.id
        INNER JOIN searchspaces ss ON d."search_space_id" = ss.id
        WHERE ${keywordWhere}
        ORDER BY ts_rank_cd(to_tsvector('english', c.content), plainto_tsquery('english', $${paramIndex})) DESC
        LIMIT $${paramIndex + 2}
      )
      SELECT
        c.id as chunk_id,
        c.content,
        d.id as document_id,
        d.title as document_title,
        d."document_type" as document_type,
        d."document_metadata" as document_metadata,
        (COALESCE(1.0 / (${k} + sem.rank), 0.0) + COALESCE(1.0 / (${k} + kw.rank), 0.0)) as score
      FROM semantic_search sem
      FULL OUTER JOIN keyword_search kw ON sem.id = kw.id
      INNER JOIN chunks c ON c.id = COALESCE(sem.id, kw.id)
      INNER JOIN documents d ON c."document_id" = d.id
      ORDER BY score DESC
      LIMIT $${paramIndex + 3}
    `;

    params.push(queryText, embeddingStr, nResults, topK);

    const results = await this.prisma.$queryRawUnsafe(query, ...params);

    // Transform results to match expected format
    const serializedResults: ChunkSearchResult[] = (results as any[]).map((row) => ({
      chunk_id: row.chunk_id,
      content: row.content,
      score: parseFloat(row.score),
      document: {
        id: row.document_id,
        title: row.document_title,
        document_type: row.document_type,
        metadata: row.document_metadata,
      },
    }));

    return serializedResults;
  }
}

