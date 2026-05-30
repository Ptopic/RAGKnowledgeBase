import { DynamicStructuredTool } from "@langchain/core/tools";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { ToolDependencies } from "../types/agent-types";

export function createAnalyzeImageTool(deps: ToolDependencies) {
	return new DynamicStructuredTool({
		name: "analyze_image",
		description:
			"Analyze an image from a URL or data URL using vision AI. Returns a detailed text description of the image content including objects, text (OCR), charts, and other visual elements. Use this when the user wants to understand or extract information from an image, including images they have uploaded or attached to their message.",
		schema: z.object({
			imageUrl: z
				.string()
				.describe("The URL of the image to analyze. Can be an HTTP/HTTPS URL, a data:image/ URL, or an uploaded:// reference (e.g. uploaded://1 for the first uploaded image)."),
		}),
		func: async ({ imageUrl }) => {
			// Resolve uploaded://N references to actual URLs
			let resolvedUrl = imageUrl;
			if (imageUrl.startsWith("uploaded://")) {
				const uploadedMap = deps.uploadedImageUrls;
				const resolved = uploadedMap?.get(imageUrl);
				if (resolved) {
					resolvedUrl = resolved;
				} else {
					return JSON.stringify({
						error: `Unknown uploaded image reference: ${imageUrl}. Available: ${uploadedMap ? Array.from(uploadedMap.keys()).join(", ") : "none"}`,
						status: "error",
					});
				}
			}

			const isDataUrl = resolvedUrl.startsWith("data:image/");
			const isHttpUrl = /^https?:\/\//i.test(resolvedUrl);

			if (!isDataUrl && !isHttpUrl) {
				return JSON.stringify({
					error: "Image URL must be HTTP/HTTPS, a data:image/ URL, or an uploaded:// reference",
					status: "error",
				});
			}

			const imageAnalysisService = deps.imageAnalysisService;
			if (!imageAnalysisService) {
				return JSON.stringify({
					error: "Image analysis service is not available",
					status: "error",
				});
			}

			// Upload image to S3 for a persistent preview URL
			let previewUrl: string | undefined;
			try {
				previewUrl = await uploadToS3(resolvedUrl, deps);
			} catch {
				// Non-fatal: analysis still works, just no preview
			}

			try {
				const results = await imageAnalysisService.describeImages([
					{ url: resolvedUrl },
				]);

				if (!results.length || !results[0].description) {
					return JSON.stringify({
						error: "Vision analysis returned no description for this image",
						previewUrl,
						status: "error",
					});
				}

				return JSON.stringify({
					description: results[0].description,
					previewUrl,
					status: "done",
				});
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				return JSON.stringify({
					error: `Failed to analyze image: ${message}`,
					previewUrl,
					status: "error",
				});
			}
		},
	});
}

async function uploadToS3(
	imageUrl: string,
	deps: ToolDependencies,
): Promise<string | undefined> {
	const uploadService = deps.uploadService;
	if (!uploadService) return undefined;

	let buffer: Buffer;
	let mimeType: string;

	if (imageUrl.startsWith("data:image/")) {
		const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
		if (!match) return undefined;
		mimeType = match[1];
		buffer = Buffer.from(match[2], "base64");
	} else if (/^https?:\/\//i.test(imageUrl)) {
		// For HTTP URLs, don't re-upload — the original URL is already public
		return imageUrl;
	} else {
		return undefined;
	}

	// Content-addressed key for dedup
	const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
	const ext = mimeType.split("/")[1] || "png";
	const key = `chat-images/${hash}.${ext}`;

	const result = await uploadService.upload(buffer, `${hash}.${ext}`, "chat-images", mimeType);
	return result.url;
}
