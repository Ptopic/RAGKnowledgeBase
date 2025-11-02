import { tool } from '@langchain/core/tools';
import z from 'zod';
import { getVectorStore } from '../embeddings';
import { triggerYoutubeVideoScrape } from '../scrape';

export const triggerYoutubeVideoScrapeTool = tool(
	async (url: string) => {
		console.log('Triggering youtube video scrape');
		return triggerYoutubeVideoScrape(url);
	},
	{
		name: 'triggerYoutubeVideoScrape',
		description: `Trigger the scraping of a youtube video using the url. 
         The tool will start a scraping job that usually takes around 7 seconds.
         The tool will return a snapsho/job id, that can be used to check the status of a scraping job.
         Make sure that the video is not already in the vector store before calling this tool.
         If video is already in vector store, do not call this tool.
         `,
		schema: z.object({
			url: z.string(),
		}),
	}
);

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

			console.log('RETRIEVED DOCS--------------------');
			console.log(retrievedDocs.length);

			if (retrievedDocs.length > 0) {
				const serializedDocs = retrievedDocs
					.map((doc) => doc.pageContent)
					.join('\n ');
				return serializedDocs;
			}

			if (Date.now() - startTime < maxWaitTime - retryInterval) {
				console.log(
					`No documents found for video_id: ${video_id}. Waiting ${retryInterval / 1000} seconds before retry...`
				);
				await new Promise((resolve) => setTimeout(resolve, retryInterval));
			}
		}

		return `Video not found in vector store after 21 seconds of waiting. The video with ID "${video_id}" may not have been processed yet or the scraping may have failed.`;
	},
	{
		name: 'retrieval',
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
			video_id: z.string().describe('The id of the video to retrieve'),
		}),
	}
);

export const retrieveSimilarVideosTool = tool(
	async ({ query }) => {
		console.log('Retrieving similar videos');
		const vectorStore = await getVectorStore();

		const retrievedDocs = await vectorStore.similaritySearch(query, 30);

		const uniqueVideos = new Map();
		retrievedDocs.forEach((doc) => {
			if (!uniqueVideos.has(doc.metadata.video_id)) {
				uniqueVideos.set(doc.metadata.video_id, {
					title: doc.metadata.video_title,
					url: doc.metadata.video_url,
				});
			}
		});

		const videoList = Array.from(uniqueVideos.values())
			.map((video) => `- [${video.title}](${video.url})`)
			.join('\n');

		return videoList;
	},
	{
		name: 'retrieveSimilarVideos',
		description: `Retrieve the most similar videos to the query. 
		Returns a formatted markdown list of video titles with clickable URLs. 
		Each video appears only once (no duplicates).`,
		schema: z.object({
			query: z.string(),
		}),
	}
);

export const retrieveStoredVideosTool = tool(
	async ({ query }) => {
		console.log('Retrieving stored videos');
		const vectorStore = await getVectorStore();

		const retrievedDocs = await vectorStore.similaritySearch(query, 100);

		const uniqueVideos = new Map();
		retrievedDocs.forEach((doc) => {
			if (!uniqueVideos.has(doc.metadata.video_id)) {
				uniqueVideos.set(doc.metadata.video_id, {
					title: doc.metadata.video_title,
					url: doc.metadata.video_url,
				});
			}
		});

		const videoList = Array.from(uniqueVideos.values())
			.map((video) => `- [${video.title}](${video.url})`)
			.join('\n');

		return videoList;
	},
	{
		name: 'retrieveStoredVideos',
		description: `Retrieve all stored videos in the vector store. 
		Returns a formatted markdown list of video titles with clickable URLs. 
		Each video appears only once (no duplicates).`,
		schema: z.object({
			query: z.string(),
		}),
	}
);
