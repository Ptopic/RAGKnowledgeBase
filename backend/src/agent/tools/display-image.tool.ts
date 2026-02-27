import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export function createDisplayImageTool() {
	return new DynamicStructuredTool({
		name: "display_image",
		description: "Display an image in the chat with metadata.",
		schema: z.object({
			src: z.string().url(),
			alt: z.string().optional(),
			title: z.string().optional(),
			description: z.string().optional(),
		}),
		func: async ({ src, alt, title, description }) => {
			if (!/^https?:\/\//i.test(src)) {
				return { error: "Image URL must be HTTP or HTTPS" };
			}

			return {
				src,
				alt: alt || "",
				title: title || "",
				description: description || "",
				display: true,
			};
		},
	});
}
