/**
 * YouTube processing strategy interface.
 *
 * Defines the contract for YouTube video processing strategies,
 * allowing different implementations (BrightData, local yt-dlp + Whisper).
 */

export interface YoutubeProcessingResult {
	success: boolean;
	documentId?: number;
	error?: string;
}

export interface YoutubeProcessingStrategy {
	process(
		videoUrl: string,
		searchSpaceId: number,
		userId: string,
		documentId: number,
	): Promise<YoutubeProcessingResult>;
}
