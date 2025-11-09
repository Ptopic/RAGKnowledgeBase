import { readFile } from "node:fs/promises";
import { createClient, DeepgramClient, PrerecordedSchema } from "@deepgram/sdk";
import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "../config/config.service";

export interface TranscriptionResult {
	text: string;
	language?: string;
	languageProbability?: number;
	duration?: number;
	words?: Array<{
		word: string;
		start: number;
		end: number;
		confidence: number;
	}>;
	metadata?: {
		model: string;
		// biome-ignore lint/suspicious/noExplicitAny: Metadata structure varies
		[key: string]: any;
	};
}

/**
 * Service for speech-to-text transcription using Deepgram API.
 * Supports audio files in various formats (mp3, wav, m4a, webm, etc.)
 *
 * Requires DEEPGRAM_API_KEY environment variable.
 * See: https://deepgram.com/
 */
@Injectable()
export class DeepgramService {
	private readonly logger = new Logger(DeepgramService.name);
	private readonly client: DeepgramClient | null;
	private readonly apiKey: string | undefined;
	private readonly enabled: boolean;
	private readonly model: string;
	private readonly language: string;

	constructor(private configService: ConfigService) {
		const sttConfig = this.configService.stt;

		// Get Deepgram configuration
		this.apiKey =
			process.env.DEEPGRAM_API_KEY || process.env.STT_SERVICE_API_KEY;
		this.enabled =
			sttConfig.service === "DEEPGRAM" || sttConfig.service === "deepgram";
		this.model = process.env.DEEPGRAM_MODEL || "nova-3";
		this.language = process.env.DEEPGRAM_LANGUAGE || "en";

		// Initialize Deepgram client if enabled and API key is available
		if (this.enabled && this.apiKey) {
			try {
				this.client = createClient(this.apiKey);
				this.logger.log(
					`Deepgram STT service initialized with model: ${this.model}`,
				);
			} catch (error) {
				this.logger.error(
					`Failed to initialize Deepgram client: ${error.message}`,
				);
				this.client = null;
			}
		} else {
			this.client = null;
			if (this.enabled) {
				this.logger.warn(
					"Deepgram STT is enabled but no API key found. Set DEEPGRAM_API_KEY or STT_SERVICE_API_KEY.",
				);
			} else {
				this.logger.log("Deepgram STT service is disabled in configuration");
			}
		}
	}

	/**
	 * Transcribe an audio file to text.
	 *
	 * @param audioBuffer - Buffer containing audio data
	 * @param options - Transcription options
	 * @returns Transcription result with text and metadata
	 */
	async transcribeBuffer(
		audioBuffer: Buffer,
		options?: {
			language?: string;
			model?: string;
			punctuate?: boolean;
			diarize?: boolean;
			smart_format?: boolean;
		},
	): Promise<TranscriptionResult> {
		if (!this.enabled) {
			throw new HttpException(
				"Deepgram STT service is not enabled. Set STT_SERVICE=DEEPGRAM in environment",
				HttpStatus.SERVICE_UNAVAILABLE,
			);
		}

		if (!this.client) {
			throw new HttpException(
				"Deepgram client not initialized. Please set DEEPGRAM_API_KEY.",
				HttpStatus.SERVICE_UNAVAILABLE,
			);
		}

		try {
			this.logger.log(
				`Transcribing audio with Deepgram (${audioBuffer.length} bytes)`,
			);

			const requestOptions: PrerecordedSchema = {
				model: options?.model || this.model,
				language: options?.language || this.language,
				punctuate: options?.punctuate ?? true,
				smart_format: options?.smart_format ?? true,
				diarize: options?.diarize ?? false,
				utterances: true,
			};

			const { result, error } =
				await this.client.listen.prerecorded.transcribeFile(
					audioBuffer,
					requestOptions,
				);

			if (error) {
				throw new HttpException(
					`Deepgram transcription failed: ${error.message}`,
					HttpStatus.INTERNAL_SERVER_ERROR,
				);
			}

			// Extract transcript from result
			const channel = result.results?.channels?.[0];
			const alternative = channel?.alternatives?.[0];

			if (!alternative?.transcript) {
				throw new HttpException(
					"No transcript returned from Deepgram",
					HttpStatus.INTERNAL_SERVER_ERROR,
				);
			}

			const transcriptionResult: TranscriptionResult = {
				text: alternative.transcript,
				language:
					result.results?.channels?.[0]?.detected_language || this.language,
				languageProbability: alternative.confidence,
				duration: result.metadata?.duration,
				words: alternative.words?.map((word) => ({
					word: word.word,
					start: word.start,
					end: word.end,
					confidence: word.confidence,
				})),
				metadata: {
					model: this.model,
					request_id: result.metadata?.request_id,
					model_info: result.metadata?.model_info,
				},
			};

			this.logger.log(
				`Successfully transcribed audio (${transcriptionResult.duration?.toFixed(2)}s, ${transcriptionResult.text.length} chars)`,
			);

			return transcriptionResult;
		} catch (error) {
			this.logger.error(
				`Error transcribing audio with Deepgram: ${error.message}`,
				error.stack,
			);

			if (error instanceof HttpException) {
				throw error;
			}

			throw new HttpException(
				`Failed to transcribe audio: ${error.message}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	/**
	 * Transcribe an audio file from a file path.
	 *
	 * @param filePath - Path to the audio file
	 * @param options - Transcription options
	 * @returns Transcription result with text and metadata
	 */
	async transcribeFile(
		filePath: string,
		options?: {
			language?: string;
			model?: string;
			punctuate?: boolean;
			diarize?: boolean;
			smart_format?: boolean;
		},
	): Promise<TranscriptionResult> {
		try {
			const audioBuffer = await readFile(filePath);
			return await this.transcribeBuffer(audioBuffer, options);
		} catch (error) {
			this.logger.error(
				`Error reading audio file for transcription: ${error.message}`,
			);
			throw new HttpException(
				`Failed to read audio file: ${error.message}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	/**
	 * Transcribe audio from a URL.
	 *
	 * @param audioUrl - URL to the audio file
	 * @param options - Transcription options
	 * @returns Transcription result with text and metadata
	 */
	async transcribeUrl(
		audioUrl: string,
		options?: {
			language?: string;
			model?: string;
			punctuate?: boolean;
			diarize?: boolean;
			smart_format?: boolean;
		},
	): Promise<TranscriptionResult> {
		if (!this.enabled) {
			throw new HttpException(
				"Deepgram STT service is not enabled",
				HttpStatus.SERVICE_UNAVAILABLE,
			);
		}

		if (!this.client) {
			throw new HttpException(
				"Deepgram client not initialized",
				HttpStatus.SERVICE_UNAVAILABLE,
			);
		}

		try {
			this.logger.log(`Transcribing audio from URL with Deepgram: ${audioUrl}`);

			const requestOptions: PrerecordedSchema = {
				model: options?.model || this.model,
				language: options?.language || this.language,
				punctuate: options?.punctuate ?? true,
				smart_format: options?.smart_format ?? true,
				diarize: options?.diarize ?? false,
				utterances: true,
			};

			const { result, error } =
				await this.client.listen.prerecorded.transcribeUrl(
					{ url: audioUrl },
					requestOptions,
				);

			if (error) {
				throw new HttpException(
					`Deepgram transcription failed: ${error.message}`,
					HttpStatus.INTERNAL_SERVER_ERROR,
				);
			}

			const channel = result.results?.channels?.[0];
			const alternative = channel?.alternatives?.[0];

			if (!alternative?.transcript) {
				throw new HttpException(
					"No transcript returned from Deepgram",
					HttpStatus.INTERNAL_SERVER_ERROR,
				);
			}

			return {
				text: alternative.transcript,
				language: channel?.detected_language || this.language,
				languageProbability: alternative.confidence,
				duration: result.metadata?.duration,
				words: alternative.words?.map((word) => ({
					word: word.word,
					start: word.start,
					end: word.end,
					confidence: word.confidence,
				})),
				metadata: {
					model: this.model,
					request_id: result.metadata?.request_id,
				},
			};
		} catch (error) {
			this.logger.error(`Error transcribing URL: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Check if Deepgram service is available.
	 *
	 * @returns True if Deepgram is available
	 */
	isAvailable(): boolean {
		return this.enabled && this.client !== null;
	}

	/**
	 * Get supported audio file formats.
	 *
	 * @returns Array of supported file extensions
	 */
	getSupportedFormats(): string[] {
		return [
			".mp3",
			".mp4",
			".m4a",
			".wav",
			".webm",
			".ogg",
			".opus",
			".flac",
			".aac",
			".mpeg",
			".mpga",
		];
	}

	/**
	 * Check if a file format is supported.
	 *
	 * @param fileName - Name of the file
	 * @returns True if format is supported
	 */
	isFormatSupported(fileName: string): boolean {
		const ext = fileName.toLowerCase().match(/\.[^.]+$/)?.[0];
		return ext ? this.getSupportedFormats().includes(ext) : false;
	}

	/**
	 * Factory method to create Deepgram service instance
	 */
	static create(configService: ConfigService): DeepgramService {
		return new DeepgramService(configService);
	}
}
