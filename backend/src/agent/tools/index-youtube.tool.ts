import { DynamicStructuredTool } from "@langchain/core/tools";
import { DocumentType } from "@prisma/client";
import { z } from "zod";
import type { ToolDependencies } from "../types/agent-types";

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 300000;

const YOUTUBE_URL_PATTERN =
	/^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;

function extractVideoId(url: string): string | null {
	const match = url.match(YOUTUBE_URL_PATTERN);
	return match ? match[1] : null;
}

export function createIndexYouTubeTool(deps: ToolDependencies) {
	return new DynamicStructuredTool({
		name: "index_youtube",
		description:
			"Transcribe and index a YouTube video into the user's knowledge base. The video transcript will be extracted, chunked, and made searchable. Returns the document ID and title once processing completes.",
		schema: z.object({
			videoUrl: z
				.string()
				.describe("The YouTube video URL to transcribe and index"),
		}),
		func: async ({ videoUrl }) => {
			const { queueService, prisma, sseService, searchSpaceId, userId } = deps;

			if (!queueService) {
				return JSON.stringify({
					error: "Queue service is not available",
					videoUrl,
					status: "error",
				});
			}
			if (!prisma) {
				return JSON.stringify({
					error: "Database service is not available",
					videoUrl,
					status: "error",
				});
			}

			const videoId = extractVideoId(videoUrl);
			if (!videoId) {
				return JSON.stringify({
					error:
						"Invalid YouTube URL. Please provide a valid YouTube video URL.",
					videoUrl,
					status: "error",
				});
			}

			try {
				const placeholderDoc = await prisma.document.create({
					data: {
						searchSpaceId,
						title: videoUrl,
						documentType: DocumentType.YOUTUBE_VIDEO,
						documentMetadata: {
							url: videoUrl,
							source: "agent_youtube_import",
							videoId,
						},
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
					await queueService.processYouTubeDocument(
						videoUrl,
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
						error: `Failed to queue YouTube video: ${msg}`,
						videoUrl,
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
							videoUrl,
							status: "error",
						});
					}

					if (doc.processingStatus === "COMPLETED") {
						return JSON.stringify({
							documentId: placeholderDoc.id,
							title: doc.title,
							videoId,
							videoUrl,
							thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
							status: "done",
						});
					}

					if (doc.processingStatus === "FAILED") {
						return JSON.stringify({
							error: "YouTube video processing failed",
							documentId: placeholderDoc.id,
							videoUrl,
							status: "error",
						});
					}

					await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
				}

				return JSON.stringify({
					documentId: placeholderDoc.id,
					title: videoUrl,
					videoUrl,
					status: "timeout",
					message:
						"Indexing is still in progress, you will be notified when it completes",
				});
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				return JSON.stringify({
					error: `Failed to index YouTube video: ${message}`,
					videoUrl,
					status: "error",
				});
			}
		},
	});
}
