import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "../config/config.service";
import axios, { AxiosInstance } from "axios";
import FormData = require("form-data");
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

export interface DoclingDocument {
	markdown: string;
	metadata?: {
		page_count?: number;
		file_type?: string;
		title?: string;
		// biome-ignore lint/suspicious/noExplicitAny: Metadata structure varies by document type
		[key: string]: any;
	};
}

export interface DoclingResponse {
	document: DoclingDocument;
	status: string;
	processing_time?: number;
	error?: string;
}

/**
 * Service for interacting with Docling API for document ETL processing.
 * Docling converts various document formats (PDF, DOCX, PPTX, etc.) to markdown.
 *
 * Requires a Docling service running (Python-based).
 * See: https://github.com/DS4SD/docling
 */
@Injectable()
export class DoclingService {
	private readonly logger = new Logger(DoclingService.name);
	private readonly axiosInstance: AxiosInstance;
	private readonly apiUrl: string;
	private readonly timeout: number;
	private readonly enabled: boolean;

	constructor(private configService: ConfigService) {
		const etlConfig = this.configService.etl;

		// Get Docling configuration from environment
		this.apiUrl =
			process.env.DOCLING_API_URL || "http://localhost:5000";
		this.timeout = Number.parseInt(
			process.env.DOCLING_TIMEOUT || "300000",
			10,
		);
		this.enabled = etlConfig.service === "DOCLING";

		// Create axios instance with default config
		this.axiosInstance = axios.create({
			baseURL: this.apiUrl,
			timeout: this.timeout,
		});

		if (this.enabled) {
			this.logger.log(
				`Docling service initialized with API URL: ${this.apiUrl}`,
			);
			// Check if service is available on startup
			this.isAvailable().then((available) => {
				if (!available) {
					this.logger.warn(
						"Docling service is not available. Document processing will fail until the service is started.",
					);
				} else {
					this.logger.log("Docling service is available and ready");
				}
			});
		} else {
			this.logger.log("Docling service is disabled in configuration");
		}
	}

	/**
	 * Process a document file using Docling API.
	 *
	 * @param fileBuffer - Buffer containing the file data
	 * @param fileName - Name of the file
	 * @returns Docling processed document with markdown content
	 */
	async processDocument(
		fileBuffer: Buffer,
		fileName: string,
	): Promise<DoclingDocument> {
		if (!this.enabled) {
			throw new HttpException(
				"Docling service is not enabled. Set ETL_SERVICE=DOCLING in environment",
				HttpStatus.SERVICE_UNAVAILABLE,
			);
		}

		try {
			this.logger.log(`Processing document with Docling: ${fileName}`);

			// Create form data
			const formData = new FormData();
			formData.append("file", fileBuffer, {
				filename: fileName,
				contentType: this.getContentType(fileName),
			});

			// Call Docling API
			const response = await this.axiosInstance.post<DoclingResponse>(
				"/convert",
				formData,
				{
					headers: {
						...formData.getHeaders(),
					},
					maxBodyLength: Number.POSITIVE_INFINITY,
					maxContentLength: Number.POSITIVE_INFINITY,
				},
			);

			if (response.data.status !== "success") {
				throw new HttpException(
					`Docling processing failed: ${response.data.error || response.data.status}`,
					HttpStatus.INTERNAL_SERVER_ERROR,
				);
			}

			this.logger.log(
				`Successfully processed document: ${fileName} (${response.data.processing_time || "N/A"}ms)`,
			);

			return response.data.document;
		} catch (error) {
			this.logger.error(
				`Error processing document with Docling: ${error.message}`,
				error.stack,
			);

			if (axios.isAxiosError(error)) {
				if (error.code === "ECONNREFUSED") {
					throw new HttpException(
						"Docling service is not available. Please ensure Docling is running at " +
							this.apiUrl,
						HttpStatus.SERVICE_UNAVAILABLE,
					);
				}
				if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
					throw new HttpException(
						`Docling processing timed out after ${this.timeout}ms. Try increasing DOCLING_TIMEOUT.`,
						HttpStatus.REQUEST_TIMEOUT,
					);
				}
				if (error.response) {
					const message =
						error.response.data?.error ||
						error.response.data?.message ||
						error.message;
					throw new HttpException(
						`Docling API error: ${message}`,
						error.response.status,
					);
				}
			}

			throw new HttpException(
				`Failed to process document: ${error.message}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	/**
	 * Process a document from a file path.
	 *
	 * @param filePath - Path to the file
	 * @returns Docling processed document with markdown content
	 */
	async processDocumentFromPath(filePath: string): Promise<DoclingDocument> {
		try {
			const fileBuffer = await readFile(filePath);
			const fileName = basename(filePath);

			return await this.processDocument(fileBuffer, fileName);
		} catch (error) {
			this.logger.error(
				`Error reading file for Docling processing: ${error.message}`,
			);
			throw new HttpException(
				`Failed to read file: ${error.message}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	/**
	 * Process a document using streaming (for large files).
	 *
	 * @param filePath - Path to the file
	 * @returns Docling processed document with markdown content
	 */
	async processDocumentStream(filePath: string): Promise<DoclingDocument> {
		if (!this.enabled) {
			throw new HttpException(
				"Docling service is not enabled",
				HttpStatus.SERVICE_UNAVAILABLE,
			);
		}

		try {
			this.logger.log(`Processing document with Docling (stream): ${filePath}`);

			const fileName = basename(filePath);
			const formData = new FormData();
			formData.append("file", createReadStream(filePath), {
				filename: fileName,
				contentType: this.getContentType(fileName),
			});

			const response = await this.axiosInstance.post<DoclingResponse>(
				"/convert",
				formData,
				{
					headers: {
						...formData.getHeaders(),
					},
					maxBodyLength: Number.POSITIVE_INFINITY,
					maxContentLength: Number.POSITIVE_INFINITY,
				},
			);

			if (response.data.status !== "success") {
				throw new HttpException(
					`Docling processing failed: ${response.data.error || response.data.status}`,
					HttpStatus.INTERNAL_SERVER_ERROR,
				);
			}

			return response.data.document;
		} catch (error) {
			this.logger.error(`Error processing document stream: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Check if Docling service is available.
	 *
	 * @returns True if Docling is available, false otherwise
	 */
	async isAvailable(): Promise<boolean> {
		if (!this.enabled) {
			return false;
		}

		try {
			const response = await this.axiosInstance.get("/health", {
				timeout: 5000,
			});
			return response.status === 200;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Get supported file types from Docling.
	 *
	 * @returns Array of supported file extensions
	 */
	getSupportedFileTypes(): string[] {
		return [
			".pdf",
			".docx",
			".doc",
			".pptx",
			".ppt",
			".xlsx",
			".xls",
			".html",
			".htm",
			".txt",
			".rtf",
			".odt",
			".odp",
			".ods",
		];
	}

	/**
	 * Check if a file type is supported by Docling.
	 *
	 * @param fileName - Name of the file
	 * @returns True if file type is supported
	 */
	isFileTypeSupported(fileName: string): boolean {
		const ext = fileName.toLowerCase().match(/\.[^.]+$/)?.[0];
		return ext ? this.getSupportedFileTypes().includes(ext) : false;
	}

	/**
	 * Get content type for a file based on extension.
	 */
	private getContentType(fileName: string): string {
		const ext = fileName.toLowerCase().match(/\.[^.]+$/)?.[0];
		const contentTypes: Record<string, string> = {
			".pdf": "application/pdf",
			".docx":
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			".doc": "application/msword",
			".pptx":
				"application/vnd.openxmlformats-officedocument.presentationml.presentation",
			".ppt": "application/vnd.ms-powerpoint",
			".xlsx":
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			".xls": "application/vnd.ms-excel",
			".html": "text/html",
			".htm": "text/html",
			".txt": "text/plain",
			".rtf": "application/rtf",
			".odt": "application/vnd.oasis.opendocument.text",
			".odp": "application/vnd.oasis.opendocument.presentation",
			".ods": "application/vnd.oasis.opendocument.spreadsheet",
		};
		return ext ? contentTypes[ext] || "application/octet-stream" : "application/octet-stream";
	}

	/**
	 * Factory method to create a Docling service instance
	 */
	static create(configService: ConfigService): DoclingService {
		return new DoclingService(configService);
	}
}
