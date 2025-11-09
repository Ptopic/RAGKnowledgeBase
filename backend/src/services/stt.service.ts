import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

interface TranscriptionResult {
	text: string;
	language: string;
	languageProbability: number;
	duration: number;
}

/**
 * Local Speech-to-Text service using Faster-Whisper
 * Note: This is a placeholder implementation. The actual STT service
 * would need to be implemented with appropriate Node.js bindings or
 * external service calls to Python-based Faster-Whisper.
 */
@Injectable()
export class STTService {
	private readonly logger = new Logger(STTService.name);
	private modelSize: string;
	private model: any = null;

	constructor(private readonly configService: ConfigService) {
		// Parse model from STT_SERVICE config (e.g., "local/base" or "local/tiny")
		const sttService =
			this.configService.get<string>("STT_SERVICE") || "local/base";
		if (sttService.startsWith("local/")) {
			this.modelSize = sttService.split("/")[1];
		} else {
			this.modelSize = "base"; // fallback
		}

		this.logger.log(`STT Service initialized with model: ${this.modelSize}`);
	}

	/**
	 * Lazy load the Whisper model
	 */
	private getModel(): any {
		if (this.model === null) {
			// Placeholder: In actual implementation, this would:
			// 1. Load Faster-Whisper model via Python bridge
			// 2. Or call external Whisper service via HTTP
			// 3. Or use a Node.js Whisper binding if available

			this.logger.warn(
				"Whisper model not loaded. " +
					"This requires integration with Python Faster-Whisper or external STT service.",
			);
			this.model = null;
		}
		return this.model;
	}

	/**
	 * Transcribe audio file to text
	 */
	async transcribeFile(
		audioPath: string,
		language?: string,
	): Promise<TranscriptionResult> {
		const model = this.getModel();

		if (model === null) {
			throw new Error(
				"STT model not initialized. " +
					"This requires integration with Python Faster-Whisper or external STT service.",
			);
		}

		try {
			this.logger.log(`Transcribing audio file: ${audioPath}`);

			// Placeholder: In actual implementation, this would:
			// 1. Call Python Faster-Whisper via subprocess
			// 2. Or send audio to external STT API
			// 3. Or use OpenAI Whisper API as fallback

			throw new Error(
				"Audio transcription not implemented. " +
					"Integrate with Python Faster-Whisper or external STT service.",
			);
		} catch (error) {
			this.logger.error(`Transcription failed: ${error.message}`);
			throw new Error(`Transcription failed: ${error.message}`);
		}
	}

	/**
	 * Transcribe audio from bytes
	 */
	async transcribeBytes(
		audioBytes: Buffer,
		filename: string = "audio.wav",
		language?: string,
	): Promise<TranscriptionResult> {
		// Save bytes to temporary file
		const suffix = path.extname(filename) || ".wav";
		const tmpDir = os.tmpdir();
		const tmpPath = path.join(
			tmpDir,
			`audio_${Date.now()}${Math.random().toString(36)}${suffix}`,
		);

		try {
			// Write bytes to temp file
			fs.writeFileSync(tmpPath, audioBytes);

			// Transcribe the file
			const result = await this.transcribeFile(tmpPath, language);

			return result;
		} finally {
			// Clean up temp file
			try {
				if (fs.existsSync(tmpPath)) {
					fs.unlinkSync(tmpPath);
				}
			} catch (error) {
				this.logger.warn(`Failed to delete temp file: ${tmpPath}`);
			}
		}
	}

	/**
	 * Factory method to create STT service instance
	 */
	static create(configService: ConfigService): STTService {
		return new STTService(configService);
	}
}

/**
 * Global STT service instance
 * Note: In NestJS, this should be injected via dependency injection
 * rather than using a global singleton.
 */
export let sttService: STTService | null = null;

export function initializeSTTService(configService: ConfigService): void {
	sttService = new STTService(configService);
}
