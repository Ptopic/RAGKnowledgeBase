import * as fs from "fs";
import * as path from "path";

/**
 * Stateless page-count estimators used to bill `INDEX_PAGE` credits
 * before a document hits an ETL service (so we can reject
 * would-be-billable uploads up front) and to reconcile the final
 * count once the processor returns.
 *
 * Heuristics are deliberately conservative — they tend to over-count
 * rather than under-count, which favors the platform. The processor's
 * reconciliation hook can refund over-estimates after the fact.
 */

const WORD_EXTS = [
	".doc",
	".docx",
	".docm",
	".dot",
	".dotm",
	".odt",
	".ott",
	".sxw",
	".stw",
	".uot",
	".rtf",
	".pages",
	".wpd",
	".wps",
	".abw",
	".zabw",
	".cwk",
	".hwp",
	".lwp",
	".mcw",
	".mw",
	".sdw",
	".vor",
];

const SLIDE_EXTS = [
	".ppt",
	".pptx",
	".pptm",
	".pot",
	".potx",
	".odp",
	".otp",
	".sxi",
	".sti",
	".uop",
	".key",
	".sda",
	".sdd",
	".sdp",
];

const SHEET_EXTS = [
	".xls",
	".xlsx",
	".xlsm",
	".xlsb",
	".xlw",
	".xlr",
	".ods",
	".ots",
	".fods",
	".numbers",
	".123",
	".wk1",
	".wk2",
	".wk3",
	".wk4",
	".wks",
	".wb1",
	".wb2",
	".wb3",
	".wq1",
	".wq2",
	".csv",
	".tsv",
	".slk",
	".sylk",
	".dif",
	".dbf",
	".prn",
	".qpw",
	".602",
	".et",
	".eth",
];

const TEXT_EXTS = [".txt", ".log", ".md", ".markdown", ".htm", ".html", ".xml"];

const IMAGE_EXTS = [
	".jpg",
	".jpeg",
	".png",
	".gif",
	".bmp",
	".tiff",
	".webp",
	".svg",
	".cgm",
	".odg",
	".pbd",
];

const AUDIO_EXTS = [".mp3", ".m4a", ".wav", ".mpga"];
const VIDEO_EXTS = [".mp4", ".mpeg", ".webm"];

/**
 * Estimate page count from a local file path by inferring from the
 * file extension and size. Throws if the file does not exist.
 *
 * - PDF: ~100KB / page
 * - Word: ~50KB / page
 * - Slide: ~200KB / slide
 * - Sheet: ~100KB / sheet (1 sheet = 1 page)
 * - eBook: ~50KB / page
 * - Plain text / markup: ~3000 bytes / page
 * - Image: 1
 * - Audio: ~1MB / minute → 1 page / minute
 * - Video: ~5MB → 1 page
 * - Other: ~80KB / page
 */
export function estimatePagesFromFilePath(filePath: string): number {
	if (!fs.existsSync(filePath)) {
		throw new Error(`File not found: ${filePath}`);
	}

	const ext = path.extname(filePath).toLowerCase();
	const size = fs.statSync(filePath).size;

	if (ext === ".pdf") {
		return Math.max(1, Math.floor(size / (100 * 1024)));
	}
	if (WORD_EXTS.includes(ext)) {
		return Math.max(1, Math.floor(size / (50 * 1024)));
	}
	if (SLIDE_EXTS.includes(ext)) {
		return Math.max(1, Math.floor(size / (200 * 1024)));
	}
	if (SHEET_EXTS.includes(ext)) {
		return Math.max(1, Math.floor(size / (100 * 1024)));
	}
	if (ext === ".epub") {
		return Math.max(1, Math.floor(size / (50 * 1024)));
	}
	if (TEXT_EXTS.includes(ext)) {
		return Math.max(1, Math.floor(size / 3000));
	}
	if (IMAGE_EXTS.includes(ext)) {
		return 1;
	}
	if (AUDIO_EXTS.includes(ext)) {
		return Math.max(1, Math.floor(size / (1024 * 1024)));
	}
	if (VIDEO_EXTS.includes(ext)) {
		return Math.max(1, Math.floor(size / (5 * 1024 * 1024)));
	}
	return Math.max(1, Math.floor(size / (80 * 1024)));
}

/** Estimate page count from Unstructured-style elements. */
export function estimatePagesFromElements(elements: unknown[]): number {
	const pageNumbers = new Set<number>();

	for (const element of elements) {
		const metadata = (element as { metadata?: { page_number?: number | null } })
			?.metadata;
		if (metadata?.page_number != null) {
			pageNumbers.add(metadata.page_number);
		}
	}

	if (pageNumbers.size > 0) return pageNumbers.size;

	let totalContentLength = 0;
	for (const element of elements) {
		totalContentLength +=
			(element as { page_content?: string }).page_content?.length ?? 0;
	}
	return Math.max(1, Math.floor(totalContentLength / 2000));
}

/** Estimate page count from a list of markdown documents (LlamaCloud). */
export function estimatePagesFromMarkdown(
	markdownDocuments: Array<{ text?: string; metadata?: { page?: number; page_number?: number } }>,
): number {
	if (!markdownDocuments || markdownDocuments.length === 0) return 1;

	let totalPages = 0;
	for (const doc of markdownDocuments) {
		const pageNum = doc.metadata?.page ?? doc.metadata?.page_number;
		if (pageNum != null) {
			totalPages += 1;
			continue;
		}
		const contentLength = doc.text?.length ?? 0;
		totalPages += Math.max(1, Math.floor(contentLength / 2000));
	}
	return Math.max(1, totalPages);
}

/** Estimate page count from a raw content length (Docling). */
export function estimatePagesFromContentLength(contentLength: number): number {
	return Math.max(1, Math.floor(contentLength / 2000));
}
