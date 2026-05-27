import { Injectable, Logger } from "@nestjs/common";
import {
	YoutubeProcessingResult,
	YoutubeProcessingStrategy,
} from "./youtube-processing-strategy.interface";
import { BrightdataYoutubeStrategy } from "./brightdata-youtube-strategy.service";
import { LocalYoutubeStrategy } from "./local-youtube-strategy.service";

@Injectable()
export class YoutubeProcessorService {
	private readonly logger = new Logger(YoutubeProcessorService.name);
	private readonly strategy: YoutubeProcessingStrategy;
	private readonly brightdataStrategy: BrightdataYoutubeStrategy;

	constructor(
		brightdataStrategy: BrightdataYoutubeStrategy,
		localStrategy: LocalYoutubeStrategy,
	) {
		const processorType = process.env.YOUTUBE_PROCESSOR || "brightdata";

		if (processorType === "local") {
			this.strategy = localStrategy;
			this.logger.log("Using LOCAL YouTube processor (yt-dlp + Whisper)");
		} else {
			this.strategy = brightdataStrategy;
			this.logger.log("Using BRIGHTDATA YouTube processor");
		}
	}

	async process(
		videoUrl: string,
		searchSpaceId: number,
		userId: string,
		documentId: number,
	): Promise<YoutubeProcessingResult> {
		return this.strategy.process(videoUrl, searchSpaceId, userId, documentId);
	}

	async addYTVideoToVectorStore(videoData: {
		transcript: string;
		video_id: string;
		title: string;
		url: string;
		searchSpaceId: number;
		userId: string;
		documentId?: number;
	}): Promise<void> {
		return this.brightdataStrategy.addYTVideoToVectorStore(videoData);
	}
}
