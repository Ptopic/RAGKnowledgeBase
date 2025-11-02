import { tool } from "@langchain/core/tools";
import z from "zod";
import { getVectorStore } from "../embeddings";

export const retrievalTool = tool(
	async ({ query, video_id }: { query: string; video_id: string }) => {
		const vectorStore = await getVectorStore();

		const maxWaitTime = 21000;
		const retryInterval = 7000;
		const startTime = Date.now();

		while (Date.now() - startTime < maxWaitTime) {
			const retrievedDocs = await vectorStore.similaritySearch(query, 30, {
				video_id,
			});

			console.log("RETRIEVED DOCS--------------------");
			console.log(retrievedDocs.length);

			if (retrievedDocs.length > 0) {
				const serializedDocs = retrievedDocs
					.map((doc) => doc.pageContent)
					.join("\n ");
				return serializedDocs;
			}

			if (Date.now() - startTime < maxWaitTime - retryInterval) {
				console.log(
					`No documents found for video_id: ${video_id}. Waiting ${retryInterval / 1000} seconds before retry...`,
				);
				await new Promise((resolve) => setTimeout(resolve, retryInterval));
			}
		}

		return `Video not found in vector store after 21 seconds of waiting. The video with ID "${video_id}" may not have been processed yet or the scraping may have failed.`;
	},
	{
		name: "retrieval",
		description: `Retrieve the most relevant chunks of the text from the transcript of a youtube video.
         
         CRITICAL WAITING BEHAVIOR:
         - If this tool is called immediately after triggerYoutubeVideoScrape, you MUST implement retry logic
         - Wait 10 seconds between each retry attempt
         - Wait a total of 21 seconds for video processing
         - Only return "Video not found" if no results after 21 seconds of waiting
         - Do NOT give up early - always wait the full 21 seconds for video processing
         
         If video is already in vector store, retrieve immediately without waiting.`,
		schema: z.object({
			query: z.string(),
			video_id: z.string().describe("The id of the video to retrieve"),
		}),
	},
);
