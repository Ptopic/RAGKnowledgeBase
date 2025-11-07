import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Exception raised when a user exceeds their page processing limit.
 */
export class PageLimitExceededError extends BadRequestException {
	public readonly pagesUsed: number;
	public readonly pagesLimit: number;
	public readonly pagesToAdd: number;

	constructor(
		message: string = 'Page limit exceeded. Please contact admin to increase limits for your account.',
		pagesUsed: number = 0,
		pagesLimit: number = 0,
		pagesToAdd: number = 0,
	) {
		super(message);
		this.pagesUsed = pagesUsed;
		this.pagesLimit = pagesLimit;
		this.pagesToAdd = pagesToAdd;
		this.name = 'PageLimitExceededError';
	}
}

/**
 * Service for checking and updating user page limits.
 */
@Injectable()
export class PageLimitService {
	constructor(private readonly prisma: PrismaService) {}

	/**
	 * Check if user has enough pages remaining for processing.
	 */
	async checkPageLimit(
		userId: string,
		estimatedPages: number = 1,
	): Promise<[boolean, number, number]> {
		// Get user's current page usage
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { pagesUsed: true, pagesLimit: true },
		});

		if (!user) {
			throw new Error(`User with ID ${userId} not found`);
		}

		const { pagesUsed, pagesLimit } = user;

		// Check if adding estimated pages would exceed limit
		if (pagesUsed + estimatedPages > pagesLimit) {
			throw new PageLimitExceededError(
				`Processing this document would exceed your page limit. ` +
					`Used: ${pagesUsed}/${pagesLimit} pages. ` +
					`Document has approximately ${estimatedPages} page(s). ` +
					`Please contact admin to increase limits for your account.`,
				pagesUsed,
				pagesLimit,
				estimatedPages,
			);
		}

		return [true, pagesUsed, pagesLimit];
	}

	/**
	 * Update user's page usage after successful processing.
	 */
	async updatePageUsage(
		userId: string,
		pagesToAdd: number,
		allowExceed: boolean = false,
	): Promise<number> {
		// Get user
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new Error(`User with ID ${userId} not found`);
		}

		// Check if this would exceed limit (only if allowExceed is false)
		const newUsage = user.pagesUsed + pagesToAdd;
		if (!allowExceed && newUsage > user.pagesLimit) {
			throw new PageLimitExceededError(
				`Cannot update page usage. Would exceed limit. ` +
					`Current: ${user.pagesUsed}/${user.pagesLimit}, ` +
					`Trying to add: ${pagesToAdd}`,
				user.pagesUsed,
				user.pagesLimit,
				pagesToAdd,
			);
		}

		// Update usage
		const updated = await this.prisma.user.update({
			where: { id: userId },
			data: { pagesUsed: newUsage },
		});

		return updated.pagesUsed;
	}

	/**
	 * Get user's current page usage and limit.
	 */
	async getPageUsage(userId: string): Promise<[number, number]> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { pagesUsed: true, pagesLimit: true },
		});

		if (!user) {
			throw new Error(`User with ID ${userId} not found`);
		}

		return [user.pagesUsed, user.pagesLimit];
	}

	/**
	 * Estimate page count from document elements (for Unstructured).
	 */
	estimatePagesFromElements(elements: any[]): number {
		// For Unstructured, we can count unique page numbers in metadata
		// or estimate based on content length
		const pageNumbers = new Set<number>();

		for (const element of elements) {
			// Try to get page number from metadata
			if (element.metadata) {
				const pageNum = element.metadata.page_number;
				if (pageNum !== null && pageNum !== undefined) {
					pageNumbers.add(pageNum);
				}
			}
		}

		// If we found page numbers in metadata, use that count
		if (pageNumbers.size > 0) {
			return pageNumbers.size;
		}

		// Otherwise, estimate: assume ~2000 chars per page
		const totalContentLength = elements.reduce((sum, element) => {
			return sum + (element.page_content?.length || 0);
		}, 0);
		const estimatedPages = Math.max(1, Math.floor(totalContentLength / 2000));

		return estimatedPages;
	}

	/**
	 * Estimate page count from markdown documents (for LlamaCloud).
	 */
	estimatePagesFromMarkdown(markdownDocuments: any[]): number {
		// For LlamaCloud, if split_by_page=true was used, each doc is a page
		// Otherwise, estimate based on content length
		if (!markdownDocuments || markdownDocuments.length === 0) {
			return 1;
		}

		// Check if documents have page metadata
		let totalPages = 0;
		for (const doc of markdownDocuments) {
			if (doc.metadata) {
				// If metadata contains page info, use it
				const pageNum = doc.metadata.page || doc.metadata.page_number;
				if (pageNum !== null && pageNum !== undefined) {
					totalPages += 1;
					continue;
				}
			}

			// Otherwise estimate from content length
			const contentLength = doc.text?.length || 0;
			const estimated = Math.max(1, Math.floor(contentLength / 2000));
			totalPages += estimated;
		}

		return Math.max(1, totalPages);
	}

	/**
	 * Estimate page count from content length (for Docling).
	 */
	estimatePagesFromContentLength(contentLength: number): number {
		// Estimate ~2000 characters per page
		return Math.max(1, Math.floor(contentLength / 2000));
	}

	/**
	 * Estimate page count from file before processing (to avoid unnecessary API calls).
	 * This is called BEFORE sending to ETL services to prevent cost on rejected files.
	 */
	estimatePagesBeforeProcessing(filePath: string): number {
		if (!fs.existsSync(filePath)) {
			throw new Error(`File not found: ${filePath}`);
		}

		const fileExt = path.extname(filePath).toLowerCase();
		const fileSize = fs.statSync(filePath).size;

		// PDF files - try to get actual page count
		if (fileExt === '.pdf') {
			try {
				// Note: In Node.js, you'd need a PDF library like pdf-parse
				// For now, fall back to size estimation
				// Typical PDF: ~100KB per page (conservative estimate)
				return Math.max(1, Math.floor(fileSize / (100 * 1024)));
			} catch (error) {
				// If PDF reading fails, fall back to size estimation
				return Math.max(1, Math.floor(fileSize / (100 * 1024)));
			}
		}

		// Word Processing Documents
		if (
			[
				'.doc',
				'.docx',
				'.docm',
				'.dot',
				'.dotm',
				'.odt',
				'.ott',
				'.sxw',
				'.stw',
				'.uot',
				'.rtf',
				'.pages',
				'.wpd',
				'.wps',
				'.abw',
				'.zabw',
				'.cwk',
				'.hwp',
				'.lwp',
				'.mcw',
				'.mw',
				'.sdw',
				'.vor',
			].includes(fileExt)
		) {
			// Typical word document: ~50KB per page (conservative)
			return Math.max(1, Math.floor(fileSize / (50 * 1024)));
		}

		// Presentation Documents
		if (
			[
				'.ppt',
				'.pptx',
				'.pptm',
				'.pot',
				'.potx',
				'.odp',
				'.otp',
				'.sxi',
				'.sti',
				'.uop',
				'.key',
				'.sda',
				'.sdd',
				'.sdp',
			].includes(fileExt)
		) {
			// Typical presentation: ~200KB per slide (conservative)
			return Math.max(1, Math.floor(fileSize / (200 * 1024)));
		}

		// Spreadsheet Documents
		if (
			[
				'.xls',
				'.xlsx',
				'.xlsm',
				'.xlsb',
				'.xlw',
				'.xlr',
				'.ods',
				'.ots',
				'.fods',
				'.numbers',
				'.123',
				'.wk1',
				'.wk2',
				'.wk3',
				'.wk4',
				'.wks',
				'.wb1',
				'.wb2',
				'.wb3',
				'.wq1',
				'.wq2',
				'.csv',
				'.tsv',
				'.slk',
				'.sylk',
				'.dif',
				'.dbf',
				'.prn',
				'.qpw',
				'.602',
				'.et',
				'.eth',
			].includes(fileExt)
		) {
			// Spreadsheets typically have 1 sheet = 1 page for ETL
			// Conservative: ~100KB per sheet
			return Math.max(1, Math.floor(fileSize / (100 * 1024)));
		}

		// E-books
		if (['.epub'].includes(fileExt)) {
			// E-books vary widely, estimate by size
			// Typical e-book: ~50KB per page
			return Math.max(1, Math.floor(fileSize / (50 * 1024)));
		}

		// Plain Text and Markup Files
		if (
			[
				'.txt',
				'.log',
				'.md',
				'.markdown',
				'.htm',
				'.html',
				'.xml',
			].includes(fileExt)
		) {
			// Plain text: ~3000 bytes per page
			return Math.max(1, Math.floor(fileSize / 3000));
		}

		// Image Files - Each image is typically processed as 1 page
		if (
			[
				'.jpg',
				'.jpeg',
				'.png',
				'.gif',
				'.bmp',
				'.tiff',
				'.webp',
				'.svg',
				'.cgm',
				'.odg',
				'.pbd',
			].includes(fileExt)
		) {
			return 1;
		}

		// Audio Files (transcription = typically 1 page per minute)
		if (['.mp3', '.m4a', '.wav', '.mpga'].includes(fileExt)) {
			// Audio files: estimate based on duration
			// Fallback: ~1MB per minute of audio, 1 page per minute transcript
			return Math.max(1, Math.floor(fileSize / (1024 * 1024)));
		}

		// Video Files
		if (['.mp4', '.mpeg', '.webm'].includes(fileExt)) {
			// Video files: very rough estimate
			return Math.max(1, Math.floor(fileSize / (5 * 1024 * 1024)));
		}

		// Other/Unknown Document Types
		// Conservative estimate: ~80KB per page
		return Math.max(1, Math.floor(fileSize / (80 * 1024)));
	}
}
