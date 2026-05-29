import { DynamicStructuredTool } from "@langchain/core/tools";
import { DocumentType } from "@prisma/client";
import { z } from "zod";
import type { ToolDependencies } from "../types/agent-types";

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 300000;

export function createIndexDocumentTool(deps: ToolDependencies) {
	return new DynamicStructuredTool({
		name: "index_document",
		description:
			"Upload and index a document file (PDF, DOCX, TXT, MD, etc.) into the user's knowledge base. The file will be processed, chunked, and made searchable. Returns the document ID and title once processing completes.",
		schema: z.object({
			filePath: z
				.string()
				.describe("The server file path of the uploaded document"),
			fileName: z
				.string()
				.describe("The original name of the file including extension"),
		}),
		func: async ({ filePath, fileName }) => {
			const { queueService, prisma, sseService, searchSpaceId, userId } = deps;

			if (!queueService) {
				return JSON.stringify({
					error: "Queue service is not available",
					fileName,
					status: "error",
				});
			}
			if (!prisma) {
				return JSON.stringify({
					error: "Database service is not available",
					fileName,
					status: "error",
				});
			}

			try {
				const placeholderDoc = await prisma.document.create({
					data: {
						searchSpaceId,
						title: fileName,
						documentType: DocumentType.FILE,
						documentMetadata: { file_name: fileName, source: "agent_upload" },
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
					await queueService.processFileDocument(
						filePath,
						fileName,
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
						error: `Failed to queue document: ${msg}`,
						fileName,
						status: "error",
					});
				}

				const startTime = Date.now();
				while (Date.now() - startTime < TIMEOUT_MS) {
					const doc = await prisma.document.findUnique({
						where: { id: placeholderDoc.id },
						select: { processingStatus: true, title: true },
					});

					if (!doc) {
						// Placeholder may have been deleted because a document with
						// the same content already existed. Look it up by name.
						const existingDoc = await prisma.document.findFirst({
							where: {
								title: fileName,
								searchSpaceId,
								processingStatus: "COMPLETED",
							},
							orderBy: { id: "desc" },
							select: { id: true, title: true },
						});

						if (existingDoc) {
							return JSON.stringify({
								documentId: existingDoc.id,
								title: existingDoc.title,
								fileName,
								status: "done",
								sources: [
									{
										id: String(existingDoc.id),
										title: existingDoc.title,
										url: "",
										type: "FILE",
									},
								],
							});
						}

						return JSON.stringify({
							error: "Document was deleted during processing",
							fileName,
							status: "error",
						});
					}

					if (doc.processingStatus === "COMPLETED") {
						const title = doc.title || fileName;
						return JSON.stringify({
							documentId: placeholderDoc.id,
							title,
							fileName,
							status: "done",
							sources: [
								{
									id: String(placeholderDoc.id),
									title,
									url: "",
									type: "FILE",
								},
							],
						});
					}

					if (doc.processingStatus === "FAILED") {
						return JSON.stringify({
							error: "Document processing failed",
							documentId: placeholderDoc.id,
							fileName,
							status: "error",
						});
					}

					await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
				}

				return JSON.stringify({
					documentId: placeholderDoc.id,
					title: fileName,
					fileName,
					status: "timeout",
					message:
						"Indexing is still in progress, you will be notified when it completes",
				});
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				return JSON.stringify({
					error: `Failed to index document: ${message}`,
					fileName,
					status: "error",
				});
			}
		},
	});
}
