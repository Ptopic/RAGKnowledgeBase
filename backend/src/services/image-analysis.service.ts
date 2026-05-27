import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { createHash } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmbeddingService } from "../retriever/embedding.service";
import { SseService } from "../sse/sse.service";
import { ImageCandidate } from "../utils/image-markdown";

type SourceType = "file" | "web" | "markdown" | "youtube";

interface AnalyzeImagesJobData {
	documentId: number;
	searchSpaceId: number;
	sourceType: SourceType;
	images: ImageCandidate[];
}

export interface VisionResult {
	short_caption?: string;
	detailed_description?: string;
	ocr_text?: string;
	chart_or_table_summary?: string;
	detected_entities?: string[];
	contains_text?: boolean;
	is_decorative?: boolean;
	confidence?: number;
}

export interface ImageDescriptionResult {
	url: string;
	description: string;
}

@Injectable()
export class ImageAnalysisService {
	private readonly logger = new Logger(ImageAnalysisService.name);

	constructor(
		private prisma: PrismaService,
		private embeddingService: EmbeddingService,
		private sseService: SseService,
	) {}

	/**
	 * Fetch and describe images via vision model, returning short descriptions
	 * suitable for inline insertion into text before chunking.
	 */
	async describeImages(
		imageUrls: { url: string; altText?: string }[],
	): Promise<ImageDescriptionResult[]> {
		const enabled = (process.env.IMAGE_ENABLE_ANALYSIS || "TRUE").toUpperCase() === "TRUE";
		if (!enabled || imageUrls.length === 0) return [];

		const apiKey = process.env.OPENROUTER_API_KEY;
		if (!apiKey) return [];

		const model = process.env.IMAGE_VISION_MODEL || "google/gemini-3-flash-preview";
		const maxBytes = parseInt(process.env.IMAGE_MAX_BYTES || "5242880", 10);
		const maxImages = parseInt(process.env.IMAGE_MAX_PER_DOCUMENT || "20", 10);
		const timeoutMs = parseInt(process.env.IMAGE_ANALYSIS_TIMEOUT_MS || "20000", 10);

		const results: ImageDescriptionResult[] = [];
		const images = imageUrls.slice(0, maxImages);

		for (const image of images) {
			try {
				const fetched = await this.fetchImageAsDataUrl(image.url, maxBytes, timeoutMs);
				if (!fetched) {
					results.push({ url: image.url, description: "" });
					continue;
				}

				const vision = await this.callVisionModel({
					apiKey,
					model,
					dataUrl: fetched.dataUrl,
					altText: image.altText,
					timeoutMs,
				});

				if (!vision) {
					results.push({ url: image.url, description: "" });
					continue;
				}

				const parts = [
					vision.short_caption,
					vision.detailed_description,
					vision.ocr_text,
					vision.chart_or_table_summary,
				].filter(Boolean);

				const description = parts.length > 0
					? parts.join(". ")
					: "";

				results.push({ url: image.url, description });
			} catch (error) {
				this.logger.warn(`Inline image description failed for ${image.url}: ${error.message}`);
				results.push({ url: image.url, description: "" });
			}
		}

		return results;
	}

	async analyzeDocumentImages(job: AnalyzeImagesJobData): Promise<void> {
		const enabled = (process.env.IMAGE_ENABLE_ANALYSIS || "TRUE").toUpperCase() === "TRUE";
		if (!enabled) return;

		const apiKey = process.env.OPENROUTER_API_KEY;
		if (!apiKey) {
			this.logger.warn("Skipping image analysis: OPENROUTER_API_KEY is not set");
			return;
		}

		const model = process.env.IMAGE_VISION_MODEL || "google/gemini-3-flash-preview";
		const maxBytes = parseInt(process.env.IMAGE_MAX_BYTES || "5242880", 10);
		const maxImages = parseInt(process.env.IMAGE_MAX_PER_DOCUMENT || "20", 10);
		const timeoutMs = parseInt(process.env.IMAGE_ANALYSIS_TIMEOUT_MS || "20000", 10);

		const document = await this.prisma.document.findUnique({ where: { id: job.documentId } });
		if (!document) return;

		const images = job.images.slice(0, maxImages);
		if (images.length === 0) return;

		await this.prisma.$executeRawUnsafe(
			`DELETE FROM chunks WHERE document_id = $1 AND content LIKE '<image_chunk>%'`,
			job.documentId,
		);

		const analyzedMeta: any[] = [];
		const imageChunks: { content: string; embedding: number[] }[] = [];

		for (const image of images) {
			try {
				const fetched = await this.fetchImageAsDataUrl(image.url, maxBytes, timeoutMs);
				if (!fetched) {
					analyzedMeta.push({ ...image, status: "skipped", reason: "fetch_failed" });
					continue;
				}

				const vision = await this.callVisionModel({
					apiKey,
					model,
					dataUrl: fetched.dataUrl,
					altText: image.altText,
					timeoutMs,
				});

				if (!vision) {
					analyzedMeta.push({ ...image, status: "failed", reason: "vision_failed" });
					continue;
				}

				const hash = createHash("sha256").update(fetched.bytes).digest("hex");
				const imageChunkText = this.buildImageChunk(job.documentId, image, vision, hash);
				const embedding = await this.embeddingService.embed(imageChunkText);
				imageChunks.push({ content: imageChunkText, embedding });

				analyzedMeta.push({
					...image,
					hash,
					mimeType: fetched.mimeType,
					status: "processed",
					analysis: vision,
				});
			} catch (error) {
				this.logger.warn(`Image analysis failed for ${image.url}: ${error.message}`);
				analyzedMeta.push({ ...image, status: "failed", reason: error.message });
			}
		}

		for (const chunk of imageChunks) {
			const vector = `[${chunk.embedding.join(",")}]`;
			await this.prisma.$executeRawUnsafe(
				`INSERT INTO chunks (content, embedding, document_id, created_at)
         VALUES ($1, $2::vector, $3, NOW())`,
				chunk.content,
				vector,
				job.documentId,
			);
		}

		const existingMeta = (document.documentMetadata || {}) as Record<string, any>;
		const updatedMeta = {
			...existingMeta,
			IMAGE_ANALYSIS: {
				enabled: true,
				sourceType: job.sourceType,
				processedAt: new Date().toISOString(),
				model,
				images: analyzedMeta,
			},
		};

		await this.prisma.document.update({
			where: { id: job.documentId },
			data: { documentMetadata: updatedMeta as any },
		});

		this.sseService.broadcastEvent({
			topic: 'documents',
			data: { action: 'update', searchSpaceId: job.searchSpaceId, documentId: job.documentId },
		});

		this.logger.log(
			`Image analysis finished for document ${job.documentId}: ${imageChunks.length}/${images.length} image chunks created`,
		);
	}

	private async fetchImageAsDataUrl(url: string, maxBytes: number, timeoutMs: number) {
		if (url.startsWith("data:image/")) {
			const [, meta, b64] = url.match(/^data:([^;]+);base64,(.+)$/) || [];
			if (!meta || !b64) return null;
			const bytes = Buffer.from(b64, "base64");
			if (bytes.length > maxBytes) return null;
			return { dataUrl: url, bytes, mimeType: meta };
		}

		if (!/^https?:\/\//i.test(url)) return null;
		const res = await axios.get<ArrayBuffer>(url, {
			responseType: "arraybuffer",
			timeout: timeoutMs,
			maxContentLength: maxBytes,
			headers: { "User-Agent": "RAGKnowledgeBase/1.0" },
		});
		const bytes = Buffer.from(res.data);
		if (bytes.length > maxBytes) return null;
		const mimeType = (String(res.headers["content-type"] || "image/jpeg")).split(";")[0];
		const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`;
		return { dataUrl, bytes, mimeType };
	}

	private async callVisionModel(args: {
		apiKey: string;
		model: string;
		dataUrl: string;
		altText?: string;
		timeoutMs: number;
	}): Promise<VisionResult | null> {
		const response = await axios.post(
			"https://openrouter.ai/api/v1/chat/completions",
			{
				model: args.model,
				temperature: 0,
				response_format: { type: "json_object" },
				messages: [
					{
						role: "system",
						content:
							"You are an image analysis system for RAG. Return strict JSON only. Be factual, concise, and avoid speculation.",
					},
					{
						role: "user",
						content: [
							{
								type: "text",
								text:
									`Analyze this image for retrieval. Alt text: ${args.altText || ""}. Return JSON with keys: short_caption, detailed_description, ocr_text, chart_or_table_summary, detected_entities (array), contains_text (boolean), is_decorative (boolean), confidence (0..1).`,
							},
							{
								type: "image_url",
								image_url: { url: args.dataUrl },
							},
						],
					},
				],
			},
			{
				timeout: args.timeoutMs,
				headers: {
					Authorization: `Bearer ${args.apiKey}`,
					"Content-Type": "application/json",
				},
			},
		);

		const content = response.data?.choices?.[0]?.message?.content;
		if (!content) return null;
		if (typeof content === "string") {
			try {
				return JSON.parse(content);
			} catch {
				return {
					short_caption: content.slice(0, 300),
					detailed_description: content.slice(0, 2000),
					confidence: 0.5,
				};
			}
		}
		return null;
	}

	private buildImageChunk(
		documentId: number,
		image: ImageCandidate,
		vision: VisionResult,
		hash: string,
	): string {
		const entities = (vision.detected_entities || []).join(", ");
		return `<image_chunk>\n<image_id>${image.imageId}</image_id>\n<document_id>${documentId}</document_id>\n<source_url>${image.url}</source_url>\n<section_hint>${image.sectionHint || ""}</section_hint>\n<alt_text>${image.altText || ""}</alt_text>\n<short_caption>${vision.short_caption || ""}</short_caption>\n<description>${vision.detailed_description || ""}</description>\n<ocr_text>${vision.ocr_text || ""}</ocr_text>\n<chart_or_table_summary>${vision.chart_or_table_summary || ""}</chart_or_table_summary>\n<entities>${entities}</entities>\n<contains_text>${String(vision.contains_text ?? false)}</contains_text>\n<is_decorative>${String(vision.is_decorative ?? false)}</is_decorative>\n<confidence>${String(vision.confidence ?? 0)}</confidence>\n<image_hash>${hash}</image_hash>\n</image_chunk>`;
	}
}
