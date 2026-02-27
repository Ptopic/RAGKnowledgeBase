import axios from "axios";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

function extractMeta(html: string, key: string): string {
	const patterns = [
		new RegExp(`<meta[^>]*property=["']og:${key}["'][^>]*content=["']([^"']*)["'][^>]*>`, "i"),
		new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${key}["'][^>]*>`, "i"),
		new RegExp(`<meta[^>]*name=["']${key}["'][^>]*content=["']([^"']*)["'][^>]*>`, "i"),
		new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${key}["'][^>]*>`, "i"),
	];

	for (const pattern of patterns) {
		const match = html.match(pattern);
		if (match?.[1]) {
			return match[1];
		}
	}

	return "";
}

function extractTitle(html: string): string {
	const ogTitle = extractMeta(html, "title");
	if (ogTitle) {
		return ogTitle;
	}
	const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
	return titleMatch?.[1]?.trim() || "Untitled";
}

export function createLinkPreviewTool() {
	return new DynamicStructuredTool({
		name: "link_preview",
		description:
			"Fetch metadata for a URL to display a rich preview card.",
		schema: z.object({
			url: z.string().url(),
		}),
		func: async ({ url }) => {
			try {
				const parsedUrl = new URL(url);
				const response = await axios.get<string>(url, {
					timeout: 10000,
					responseType: "text",
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
					},
				});

				const html = response.data || "";
				return {
					title: extractTitle(html),
					description: extractMeta(html, "description"),
					thumbnail: extractMeta(html, "image"),
					domain: parsedUrl.hostname,
					url,
				};
			} catch (error) {
				const message = error instanceof Error ? error.message : "Unknown error";
				return {
					error: `Failed to load preview: ${message}`,
					url,
				};
			}
		},
	});
}
