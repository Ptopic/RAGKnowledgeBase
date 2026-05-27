import { DynamicStructuredTool } from "@langchain/core/tools";
import { DocumentType } from "@prisma/client";
import { z } from "zod";
import type { ToolDependencies } from "../types/agent-types";

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 300000;

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
						return JSON.stringify({
							documentId: placeholderDoc.id,
							title: doc.title,
							url,
							description: metadata.description || "",
							ogImage: metadata.ogImage || "",
							status: "done",
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
