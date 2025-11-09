import { readFile } from "node:fs/promises";
import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";
import * as FormData from "form-data";
import { ConfigService } from "../config/config.service";

export interface LlamaCloudDocument {
	markdown: string;
	metadata?: {
		pages?: number;
		title?: string;
		// biome-ignore lint/suspicious/noExplicitAny: LlamaCloud metadata structure varies
		[key: string]: any;
	};
}

export interface LlamaCloudResponse {
	// biome-ignore lint/suspicious/noExplicitAny: LlamaCloud API response structure varies
	[key: string]: any;
}

/**
 * Service for document processing using LlamaCloud ETL API.
 * LlamaCloud provides advanced document parsing with support for complex layouts,
 * tables, images, and structured data extraction.
 *
 * Requires LLAMA_CLOUD_API_KEY environment variable.
 * See: https://cloud.llamaindex.ai/
 */
@Injectable()
export class LlamaCloudService {
	private readonly logger = new Logger(LlamaCloudService.name);
	private readonly axiosInstance: AxiosInstance;
	private readonly apiKey: string | undefined;
	private readonly apiUrl: string;
	private readonly timeout: number;
	private readonly enabled: boolean;

	constructor(private configService: ConfigService) {
		const etlConfig = this.configService.etl;

		// Get LlamaCloud configuration
		this.apiKey = process.env.LLAMA_CLOUD_API_KEY;
		this.apiUrl =
			process.env.LLAMA_CLOUD_API_URL ||
			"https://api.cloud.llamaindex.ai/api/parsing";
		this.timeout =
			Number.parseInt(process.env.LLAMA_CLOUD_TIMEOUT || "0") || 300000;
		this.enabled = etlConfig.service === "LLAMACLOUD";

		// Initialize axios instance
		this.axiosInstance = axios.create({
			baseURL: this.apiUrl,
			timeout: this.timeout,
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
			},
		});

		if (this.enabled && this.apiKey) {
			this.logger.log("LlamaCloud ETL service initialized");
			this.logger.log(`Using API URL: ${this.apiUrl}`);
		} else if (this.enabled && !this.apiKey) {
			this.logger.warn(
				"LlamaCloud ETL is enabled but no API key found. Set LLAMA_CLOUD_API_KEY.",
			);
		} else {
			this.logger.log("LlamaCloud ETL service is disabled in configuration");
		}
	}

	/**
	 * Process a document from file buffer using LlamaCloud.
	 */
	async processDocument(
		fileBuffer: Buffer,
		fileName: string,
	): Promise<LlamaCloudDocument> {
		if (!this.enabled) {
			throw new HttpException(
				"LlamaCloud ETL service is not enabled. Set ETL_SERVICE=LLAMACLOUD in environment",
				HttpStatus.SERVICE_UNAVAILABLE,
			);
		}

		if (!this.apiKey) {
			throw new HttpException(
				"LlamaCloud API key not configured. Please set LLAMA_CLOUD_API_KEY.",
				HttpStatus.SERVICE_UNAVAILABLE,
			);
		}

		try {
			this.logger.log(`Processing document with LlamaCloud: ${fileName}`);

			const formData = new FormData();
			formData.append("file", fileBuffer, {
				filename: fileName,
				contentType: this.getContentType(fileName),
			});

			// LlamaCloud specific parameters
			formData.append(
				"parsing_instruction",
				"Extract all content including tables, images, and structured data",
			);
			formData.append("result_type", "markdown");
			formData.append("language", "en");

			const response = await this.axiosInstance.post<LlamaCloudResponse>(
				"/upload",
				formData,
				{
					headers: {
						...formData.getHeaders(),
					},
					maxBodyLength: Number.POSITIVE_INFINITY,
					maxContentLength: Number.POSITIVE_INFINITY,
				},
			);

			this.logger.debug(
				`LlamaCloud upload response: ${JSON.stringify(response.data)}`,
			);

			// Check if the response already contains the result
			if (response.data.markdown || response.data.text) {
				this.logger.log("Document already processed in upload response");
				return this.extractMarkdownFromResult(response.data);
			}

			// Extract job ID and poll for results
			const jobId = response.data.id || response.data.job_id;

			if (!jobId) {
				this.logger.error(
					`No job ID in response. Response keys: ${Object.keys(response.data).join(", ")}`,
				);
				throw new HttpException(
					"No job ID returned from LlamaCloud",
					HttpStatus.INTERNAL_SERVER_ERROR,
				);
			}

			this.logger.log(`Got job ID: ${jobId}, polling for completion...`);

			// Poll for completion
			const result = await this.pollJobCompletion(jobId);

			return this.extractMarkdownFromResult(result);
		} catch (error) {
			if (axios.isAxiosError(error)) {
				const status =
					error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
				const message =
					error.response?.data?.error ||
					error.response?.data?.message ||
					error.message;

				this.logger.error(
					`LlamaCloud API error: ${message}`,
					error.response?.data,
				);

				throw new HttpException(
					`LlamaCloud processing failed: ${message}`,
					status,
				);
			}

			this.logger.error(
				`Error processing document with LlamaCloud: ${error.message}`,
				error.stack,
			);

			throw new HttpException(
				`Failed to process document: ${error.message}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	/**
	 * Process a document from file path using LlamaCloud.
	 */
	async processDocumentFromPath(filePath: string): Promise<LlamaCloudDocument> {
		try {
			const fileBuffer = await readFile(filePath);
			const fileName = filePath.split("/").pop() || "document";

			return await this.processDocument(fileBuffer, fileName);
		} catch (error) {
			this.logger.error(
				`Error reading file for LlamaCloud processing: ${error.message}`,
			);
			throw new HttpException(
				`Failed to read file: ${error.message}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	/**
	 * Poll LlamaCloud job for completion.
	 * Based on the official TypeScript SDK at:
	 * https://github.com/run-llama/llama_cloud_services/blob/main/ts/llama_cloud_services/src/reader.ts
	 */
	private async pollJobCompletion(
		jobId: string,
		maxAttempts = 60,
		intervalMs = 5000,
	): Promise<LlamaCloudResponse> {
		let attempts = 0;

		while (attempts < maxAttempts) {
			try {
				const response = await this.axiosInstance.get(`/job/${jobId}`);

				const status = response.data.status;

				if (status === "SUCCESS" || status === "COMPLETED") {
					this.logger.log(`LlamaCloud job ${jobId} completed successfully`);

					// Now fetch the actual result using the correct endpoint
					// According to the SDK, the endpoint is: /api/v1/parsing/job/{job_id}/result/markdown
					// But since our base URL is already /api/parsing, we need: /job/{jobId}/result/markdown
					try {
						this.logger.log(
							`Fetching markdown result from: /job/${jobId}/result/markdown`,
						);
						const resultResponse = await this.axiosInstance.get(
							`/job/${jobId}/result/markdown`,
						);

						this.logger.debug(
							`Result response keys: ${Object.keys(resultResponse.data).join(", ")}`,
						);

						// The response structure should be: { markdown: string, job_metadata: object }
						if (resultResponse.data?.markdown) {
							this.logger.log(
								`Successfully retrieved markdown content (${resultResponse.data.markdown.length} chars)`,
							);
							return resultResponse.data;
						}

						// If markdown field is not present, log and try alternative
						this.logger.warn(
							`Unexpected response structure: ${JSON.stringify(resultResponse.data)}`,
						);
					} catch (markdownError) {
						this.logger.error(
							`Failed to fetch markdown result: ${markdownError.message}`,
						);
						if (markdownError.response) {
							this.logger.error(
								`Response status: ${markdownError.response.status}`,
							);
							this.logger.error(
								`Response data: ${JSON.stringify(markdownError.response.data)}`,
							);
						}
					}

					// Fallback: try JSON result endpoint
					try {
						this.logger.log(
							`Trying fallback JSON endpoint: /job/${jobId}/result/json`,
						);
						const jsonResponse = await this.axiosInstance.get(
							`/job/${jobId}/result/json`,
						);

						// JSON response structure: { pages: array, job_metadata: object }
						if (jsonResponse.data?.pages) {
							this.logger.log(
								`Successfully retrieved JSON result with ${jsonResponse.data.pages.length} pages`,
							);
							// Convert pages array to markdown
							const markdown = jsonResponse.data.pages
								.map(
									(page: { md?: string; text?: string }) =>
										page.md || page.text || "",
								)
								.join("\n\n---\n\n");
							return {
								markdown,
								job_metadata: jsonResponse.data.job_metadata,
							};
						}
					} catch (jsonError) {
						this.logger.error(
							`JSON endpoint also failed: ${jsonError.message}`,
						);
					}

					// Last resort: return the status response with a warning
					this.logger.warn(
						"All result endpoints failed, returning status response as fallback",
					);
					return response.data;
				}

				if (status === "ERROR" || status === "FAILED") {
					const errorMsg =
						response.data.error ||
						response.data.error_message ||
						"Unknown error";
					throw new HttpException(
						`LlamaCloud job failed: ${errorMsg}`,
						HttpStatus.INTERNAL_SERVER_ERROR,
					);
				}

				// Status is PENDING or PROCESSING, wait and retry
				this.logger.log(
					`LlamaCloud job ${jobId} status: ${status}, waiting...`,
				);
				await this.sleep(intervalMs);
				attempts++;
			} catch (error) {
				if (error instanceof HttpException) {
					throw error;
				}

				this.logger.error(`Error polling LlamaCloud job: ${error.message}`);
				throw new HttpException(
					`Failed to get job status: ${error.message}`,
					HttpStatus.INTERNAL_SERVER_ERROR,
				);
			}
		}

		throw new HttpException(
			`LlamaCloud job ${jobId} timed out after ${maxAttempts} attempts`,
			HttpStatus.REQUEST_TIMEOUT,
		);
	}

	/**
	 * Extract markdown content from LlamaCloud result.
	 */
	private extractMarkdownFromResult(
		result: LlamaCloudResponse,
	): LlamaCloudDocument {
		try {
			// Log the result structure for debugging
			this.logger.debug(
				`Extracting markdown from result with keys: ${Object.keys(result).join(", ")}`,
			);

			// LlamaCloud returns results in different formats depending on the endpoint
			let markdown = "";
			let metadata: LlamaCloudDocument["metadata"] = {};

			// Try different response formats
			if (result.markdown) {
				markdown = result.markdown;
			} else if (result.result?.markdown) {
				markdown = result.result.markdown;
			} else if (result.data?.markdown) {
				markdown = result.data.markdown;
			} else if (result.text) {
				markdown = result.text;
			} else if (result.result?.text) {
				markdown = result.result.text;
			} else if (result.data?.text) {
				markdown = result.data.text;
			} else {
				// Fallback: try to extract any text content
				markdown = this.extractTextFromObject(result);
			}

			// Extract metadata
			if (result.metadata) {
				metadata = result.metadata;
			} else if (result.result?.metadata) {
				metadata = result.result.metadata;
			}

			// Add page count if available
			if (result.pages || result.result?.pages) {
				metadata.pages = result.pages || result.result.pages;
			}

			// Add title if available
			if (result.title || result.result?.title) {
				metadata.title = result.title || result.result.title;
			}

			if (!markdown) {
				this.logger.error(
					`No markdown content found. Result structure: ${JSON.stringify(result, null, 2)}`,
				);
				throw new Error("No markdown content found in LlamaCloud response");
			}

			// Check if markdown is just a status string (like "SUCCESS")
			if (markdown.length < 20 && markdown.toUpperCase() === markdown) {
				this.logger.error(
					`Markdown appears to be a status string: "${markdown}". Full result: ${JSON.stringify(result, null, 2)}`,
				);
				throw new Error(
					`Invalid markdown content (appears to be status): ${markdown}`,
				);
			}

			this.logger.log(
				`Extracted markdown: ${markdown.length} characters, ${metadata.pages || "unknown"} pages`,
			);

			return {
				markdown,
				metadata,
			};
		} catch (error) {
			this.logger.error(
				`Error extracting markdown from result: ${error.message}`,
			);
			throw new HttpException(
				"Failed to extract markdown from LlamaCloud response",
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	/**
	 * Extract text content from nested object (fallback).
	 */
	// biome-ignore lint/suspicious/noExplicitAny: Recursive extraction requires any type
	private extractTextFromObject(obj: any): string {
		if (typeof obj === "string") {
			return obj;
		}

		if (Array.isArray(obj)) {
			return obj.map((item) => this.extractTextFromObject(item)).join("\n\n");
		}

		if (typeof obj === "object" && obj !== null) {
			// Fields to look for in priority order
			const textFields = ["text", "content", "markdown", "body", "data"];
			// Fields to skip (metadata/status fields that shouldn't be treated as content)
			const skipFields = [
				"status",
				"id",
				"job_id",
				"created_at",
				"updated_at",
				"error",
			];

			for (const field of textFields) {
				if (obj[field]) {
					return this.extractTextFromObject(obj[field]);
				}
			}

			// Try to extract from all values, but skip known metadata fields
			return Object.entries(obj)
				.filter(([key]) => !skipFields.includes(key.toLowerCase()))
				.map(([, value]) => this.extractTextFromObject(value))
				.filter((text) => text && text.length > 0)
				.join("\n\n");
		}

		return "";
	}

	/**
	 * Get content type for file.
	 */
	private getContentType(fileName: string): string {
		const ext = fileName.toLowerCase().split(".").pop();

		const contentTypes: Record<string, string> = {
			pdf: "application/pdf",
			docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			doc: "application/msword",
			pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
			ppt: "application/vnd.ms-powerpoint",
			xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			xls: "application/vnd.ms-excel",
			txt: "text/plain",
			html: "text/html",
			htm: "text/html",
			xml: "application/xml",
			json: "application/json",
			csv: "text/csv",
			rtf: "application/rtf",
			odt: "application/vnd.oasis.opendocument.text",
			ods: "application/vnd.oasis.opendocument.spreadsheet",
			odp: "application/vnd.oasis.opendocument.presentation",
		};

		return contentTypes[ext || ""] || "application/octet-stream";
	}

	/**
	 * Sleep utility for polling.
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Check if LlamaCloud service is available.
	 */
	async isAvailable(): Promise<boolean> {
		if (!this.enabled || !this.apiKey) {
			return false;
		}

		try {
			// Try to ping the API or check authentication
			await this.axiosInstance.get("/health", {
				timeout: 5000,
			});
			return true;
		} catch {
			// If health endpoint doesn't exist, assume available if API key is set
			return !!this.apiKey;
		}
	}

	/**
	 * Check if file type is supported by LlamaCloud.
	 */
	isFileTypeSupported(fileName: string): boolean {
		const supportedTypes = this.getSupportedFileTypes();
		const ext = fileName.toLowerCase().split(".").pop();
		return supportedTypes.includes(`.${ext}`);
	}

	/**
	 * Get supported file types.
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
			".txt",
			".html",
			".htm",
			".xml",
			".json",
			".csv",
			".rtf",
			".odt",
			".ods",
			".odp",
		];
	}

	/**
	 * Factory method to create LlamaCloud service instance.
	 */
	static create(configService: ConfigService): LlamaCloudService {
		return new LlamaCloudService(configService);
	}
}
