import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { SearchMode } from "../dtos/researcher.dto";
import { Document } from "../utils/agent.utils";
import type { ToolDependencies } from "../types/agent-types";

const SEARCHABLE_CONNECTOR_MAP: Record<string, string> = {
	YOUTUBE_VIDEO: "YOUTUBE_VIDEO",
	CRAWLED_URL: "CRAWLED_URL",
	FILE: "FILE",
	SLACK_CONNECTOR: "SLACK_CONNECTOR",
	NOTION_CONNECTOR: "NOTION_CONNECTOR",
	GITHUB_CONNECTOR: "GITHUB_CONNECTOR",
	GOOGLE_CALENDAR_CONNECTOR: "GOOGLE_CALENDAR_CONNECTOR",
	GOOGLE_GMAIL_CONNECTOR: "GOOGLE_GMAIL_CONNECTOR",
};

const DEFAULT_CONNECTORS = Object.keys(SEARCHABLE_CONNECTOR_MAP);

function normalizeConnectors(connectors: string[]): string[] {
	const normalized = connectors
		.map((connector) => SEARCHABLE_CONNECTOR_MAP[connector] || connector)
		.filter(Boolean);

	const deduped: string[] = [];
	const seen = new Set<string>();
	for (const connector of normalized) {
		if (!seen.has(connector)) {
			seen.add(connector);
			deduped.push(connector);
		}
	}

	return deduped;
}

async function fetchSelectedDocuments(
	deps: ToolDependencies,
): Promise<Document[]> {
	const documentIds = deps.documentIdsToAddInContext || [];
	if (!documentIds.length) {
		return [];
	}

	const documents = await deps.prisma.document.findMany({
		where: {
			id: { in: documentIds },
			searchSpaceId: deps.searchSpaceId,
			searchSpace: { userId: deps.userId },
		},
		include: {
			chunks: {
				orderBy: { id: "asc" },
				take: 30,
			},
		},
	});

	const formattedDocuments: Document[] = [];
	for (const doc of documents) {
		for (const chunk of doc.chunks) {
			formattedDocuments.push({
				chunk_id: chunk.id,
				content: chunk.content,
				score: 1,
				document: {
					id: doc.id,
					title: doc.title,
					document_type: doc.documentType,
					metadata: (doc.documentMetadata as Record<string, unknown>) || {},
				},
				source: doc.documentType,
			});
		}
	}

	return formattedDocuments;
}

function escapeXml(input: string): string {
	return input
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function formatDocumentsAsXml(documents: Document[]): string {
	if (!documents.length) {
		return "<documents></documents>";
	}

	const grouped = new Map<
		number,
		{
			documentType: string;
			title: string;
			url: string;
			metadata: Record<string, unknown>;
			chunks: Array<{ id: string | number; content: string }>;
		}
	>();

	for (const doc of documents) {
		const docInfo = doc.document;
		if (!docInfo) {
			continue;
		}
		const existing = grouped.get(docInfo.id);
		if (existing) {
			existing.chunks.push({
				id: doc.chunk_id,
				content: doc.content || "",
			});
			continue;
		}
		const metadata = (docInfo.metadata || {}) as Record<string, unknown>;
		grouped.set(docInfo.id, {
			documentType: docInfo.document_type || "UNKNOWN",
			title: docInfo.title || "Untitled",
			url: typeof metadata.url === "string" ? metadata.url : "",
			metadata,
			chunks: [
				{
					id: doc.chunk_id,
					content: doc.content || "",
				},
			],
		});
	}

	const xmlParts: string[] = ["<documents>"];

	for (const [docId, value] of grouped) {
		xmlParts.push("<document>");
		xmlParts.push("<document_metadata>");
		xmlParts.push(`<document_id>${docId}</document_id>`);
		xmlParts.push(
			`<document_type>${escapeXml(value.documentType)}</document_type>`,
		);
		xmlParts.push(`<title><![CDATA[${value.title}]]></title>`);
		xmlParts.push(`<url><![CDATA[${value.url}]]></url>`);
		xmlParts.push(
			`<metadata_json><![CDATA[${JSON.stringify(value.metadata)}]]></metadata_json>`,
		);
		xmlParts.push("</document_metadata>");
		xmlParts.push("<document_content>");
		for (const chunk of value.chunks) {
			xmlParts.push(
				`<chunk id='${chunk.id}'><![CDATA[${chunk.content}]]></chunk>`,
			);
		}
		xmlParts.push("</document_content>");
		xmlParts.push("</document>");
	}

	xmlParts.push("</documents>");
	return xmlParts.join("\n");
}

function extractSourceMetadata(documents: Document[]): Array<{
	id: string;
	title: string;
	url: string;
	type: string;
	ogImage?: string;
}> {
	const seen = new Set<string>();
	const sources: Array<{
		id: string;
		title: string;
		url: string;
		type: string;
		ogImage?: string;
	}> = [];

	for (const doc of documents) {
		const docInfo = doc.document;
		if (!docInfo) continue;
		const key = String(docInfo.id);
		if (seen.has(key)) continue;
		seen.add(key);

		const metadata = (docInfo.metadata || {}) as Record<string, unknown>;
		const url = typeof metadata.url === "string" ? metadata.url : "";
		const ogImage =
			typeof metadata.ogImage === "string" ? metadata.ogImage : undefined;

		sources.push({
			id: key,
			title: docInfo.title || "Untitled",
			url,
			type: docInfo.document_type || "UNKNOWN",
			ogImage,
		});
	}

	return sources;
}

export function createSearchKnowledgeBaseTool(deps: ToolDependencies) {
	return new DynamicStructuredTool({
		name: "search_knowledge_base",
		description:
			"Search the user's personal knowledge base for relevant information.",
		schema: z.object({
			query: z.string(),
			top_k: z.number().int().min(1).max(50).default(10),
			connectors_to_search: z.array(z.string()).optional(),
			title_filter: z.string().optional(),
			date_start: z
				.string()
				.nullable()
				.optional()
				.describe(
					"Optional ISO date (YYYY-MM-DD). When set, calendar results are filtered to events starting on/after this date. Pair with date_end for a window.",
				),
			date_end: z
				.string()
				.nullable()
				.optional()
				.describe(
					"Optional ISO date (YYYY-MM-DD). When set, calendar results are filtered to events starting on/before this date. Pair with date_start for a window.",
				),
		}),
		func: async ({
			query,
			top_k,
			connectors_to_search,
			title_filter,
			date_start,
			date_end,
		}) => {
			const requestedConnectors = connectors_to_search?.length
				? connectors_to_search
				: deps.defaultConnectors?.length
					? deps.defaultConnectors
					: DEFAULT_CONNECTORS;
			let connectors = normalizeConnectors(requestedConnectors);
			if (!connectors.length) {
				connectors = DEFAULT_CONNECTORS;
			}

			const allDocuments: Document[] = [];

			const selectedDocuments = await fetchSelectedDocuments(deps);
			if (selectedDocuments.length) {
				allDocuments.push(...selectedDocuments);
			}

			for (const connector of connectors) {
				try {
					const result = await deps.connectorService.searchByDocumentType(
						connector,
						query,
						deps.userId,
						deps.searchSpaceId,
						top_k,
						SearchMode.CHUNKS,
						title_filter,
						{ start: date_start ?? null, end: date_end ?? null },
					);

					if (result?.chunks?.length) {
						allDocuments.push(...result.chunks);
					}
				} catch {
					continue;
				}
			}

			if (!allDocuments.length) {
				return "No relevant documents were found in the knowledge base.";
			}

			const dedupedDocuments: Document[] = [];
			const seenChunkIds = new Set<string>();
			for (const doc of allDocuments) {
				const key = String(doc.chunk_id || "");
				if (!key || seenChunkIds.has(key)) {
					continue;
				}
				seenChunkIds.add(key);
				dedupedDocuments.push(doc);
			}

			const topDocs = dedupedDocuments.slice(0, 150);
			const xmlContent = formatDocumentsAsXml(topDocs);
			const sourceMetadata = extractSourceMetadata(topDocs);

			if (sourceMetadata.length === 0) {
				return xmlContent;
			}

			return JSON.stringify({
				sources: sourceMetadata,
				content: xmlContent,
			});
		},
	});
}
