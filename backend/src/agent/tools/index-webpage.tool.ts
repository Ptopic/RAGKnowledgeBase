import { DynamicStructuredTool } from "@langchain/core/tools";
import { DocumentType } from "@prisma/client";
import axios from "axios";
import { z } from "zod";
import type { ToolDependencies } from "../types/agent-types";

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 300000;

function extractMeta(html: string, key: string): string {
	const patterns = [
		new RegExp(
			`<meta[^>]*property=["']og:${key}["'][^>]*content=["']([^"']*)["'][^>]*>`,
			"i",
		),
		new RegExp(
			`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${key}["'][^>]*>`,
			"i",
		),
		new RegExp(
			`<meta[^>]*name=["']${key}["'][^>]*content=["']([^"']*)["'][^>]*>`,
			"i",
		),
		new RegExp(
			`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${key}["'][^>]*>`,
			"i",
		),
	];

	for (const pattern of patterns) {
		const match = html.match(pattern);
		if (match?.[1]) {
			return match[1];
		}
	}

	return "";
}

function resolveImageUrl(rawUrl: string, pageUrl: string): string {
	if (!rawUrl) return rawUrl;
	try {
		return new URL(rawUrl, pageUrl).href;
	} catch {
		return rawUrl;
	}
}

async function fetchOgMetadata(
	url: string,
): Promise<{ title: string; description: string; ogImage: string }> {
	try {
		const response = await axios.get<string>(url, {
			timeout: 10000,
			responseType: "text",
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
			},
		});

		const html = response.data || "";
		const ogTitle = extractMeta(html, "title");
		const ogDescription = extractMeta(html, "description");
		const ogImage = resolveImageUrl(extractMeta(html, "image"), url);

		return {
			title: ogTitle || "",
			description: ogDescription || "",
			ogImage: ogImage || "",
		};
	} catch {
		return { title: "", description: "", ogImage: "" };
	}
}

export function createIndexWebpageTool(deps: ToolDependencies) {
	return new DynamicStructuredTool({
		name: "index_webpage",
		description:
			"Crawl and index a web page URL into the user's knowledge base. The page content will be extracted, chunked, and made searchable. Returns the document ID and title once processing completes.",
		schema: z.object({
			url: z
				.string()
				.url()
				.describe("The HTTP/HTTPS URL of the web page to crawl and index"),
		}),
		func: async ({ url }) => {
			const { queueService, prisma, sseService, searchSpaceId, userId } = deps;

			if (!queueService) {
				return JSON.stringify({
					error: "Queue service is not available",
					url,
					status: "error",
				});
			}
			if (!prisma) {
				return JSON.stringify({
					error: "Database service is not available",
					url,
					status: "error",
				});
			}

			try {
			const ogMetadataPromise = fetchOgMetadata(url);

				const placeholderDoc = await prisma.document.create({
					data: {
						searchSpaceId,
						title: url,
						documentType: DocumentType.CRAWLED_URL,
						documentMetadata: { url, source: "agent_url_crawl" },
						content: null,
						contentHash: null,
						processingStatus: "PROCESSING",
						processingStartedAt: new Date(),
					},
				});

				if (sseService) {
					await sseService.broadcastEvent({
						topic: "documents",
						data: {
							action: "create",
							searchSpaceId,
							documentId: placeholderDoc.id,
						},
					});
				}

				try {
					await queueService.processUrlDocument(
						url,
						searchSpaceId,
						userId,
						placeholderDoc.id,
					);
				} catch (queueError) {
					await prisma.document.update({
						where: { id: placeholderDoc.id },
						data: {
							processingStatus: "FAILED",
							processingCompletedAt: new Date(),
						},
					});
					if (sseService) {
						await sseService.broadcastEvent({
							topic: "documents",
							data: {
								action: "update",
								searchSpaceId,
								documentId: placeholderDoc.id,
							},
						});
					}
					const msg =
						queueError instanceof Error
							? queueError.message
							: "Unknown queue error";
					return JSON.stringify({
						error: `Failed to queue URL: ${msg}`,
						url,
						status: "error",
					});
				}

				const startTime = Date.now();
				while (Date.now() - startTime < TIMEOUT_MS) {
					const doc = await prisma.document.findUnique({
						where: { id: placeholderDoc.id },
						select: {
							processingStatus: true,
							title: true,
							documentMetadata: true,
						},
					});

					if (!doc) {
						return JSON.stringify({
							error: "Document was deleted during processing",
							url,
							status: "error",
						});
					}

					if (doc.processingStatus === "COMPLETED") {
						const metadata = (doc.documentMetadata || {}) as Record<
							string,
							unknown
						>;
						const title = doc.title || url;
						const ogData = await ogMetadataPromise;
						const description =
							(metadata.description as string) || ogData.description || "";
						const ogImage =
							(metadata.ogImage as string) || ogData.ogImage || "";

						if (ogImage && !metadata.ogImage) {
							await prisma.document.update({
								where: { id: placeholderDoc.id },
								data: {
									documentMetadata: {
										...metadata,
										ogImage,
										description: description || undefined,
									},
								},
							}).catch(() => {});
						}

						return JSON.stringify({
							documentId: placeholderDoc.id,
							title,
							url,
							description,
							ogImage,
							status: "done",
							sources: [
								{
									id: String(placeholderDoc.id),
									title,
									url,
									type: "CRAWLED_URL",
									ogImage: ogImage || undefined,
								},
							],
						});
					}

					if (doc.processingStatus === "FAILED") {
						return JSON.stringify({
							error: "Web page processing failed",
							documentId: placeholderDoc.id,
							url,
							status: "error",
						});
					}

					await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
				}

				return JSON.stringify({
					documentId: placeholderDoc.id,
					title: url,
					url,
					status: "timeout",
					message:
						"Indexing is still in progress, you will be notified when it completes",
				});
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				return JSON.stringify({
					error: `Failed to index web page: ${message}`,
					url,
					status: "error",
				});
			}
		},
	});
}
