import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { ToolDependencies } from "../types/agent-types";

export function createAnalyzeImageTool(deps: ToolDependencies) {
	return new DynamicStructuredTool({
		name: "analyze_image",
		description:
			"Analyze an image from a URL using vision AI. Returns a detailed text description of the image content including objects, text (OCR), charts, and other visual elements. Use this when the user wants to understand or extract information from an image.",
		schema: z.object({
			imageUrl: z
				.string()
				.url()
				.describe("The HTTP/HTTPS URL of the image to analyze"),
		}),
		func: async ({ imageUrl }) => {
			if (!/^https?:\/\//i.test(imageUrl)) {
				return JSON.stringify({
					error: "Image URL must be HTTP or HTTPS",
					imageUrl,
					status: "error",
				});
			}

			const imageAnalysisService = deps.imageAnalysisService;
			if (!imageAnalysisService) {
				return JSON.stringify({
					error: "Image analysis service is not available",
					imageUrl,
					status: "error",
				});
			}

			try {
				const results = await imageAnalysisService.describeImages([
					{ url: imageUrl },
				]);

				if (!results.length || !results[0].description) {
					return JSON.stringify({
						error: "Vision analysis returned no description for this image",
						imageUrl,
						status: "error",
					});
				}

				return JSON.stringify({
					imageUrl,
					description: results[0].description,
					status: "done",
				});
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				return JSON.stringify({
					error: `Failed to analyze image: ${message}`,
					imageUrl,
					status: "error",
				});
			}
		},
	});
}
