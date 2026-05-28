/**
 * Shared accepted file types for document uploads.
 * Used by: chat attachment picker, documents upload page.
 * Mirrors the backend LlamaCloud / Docling supported file types.
 */

const audioFileTypes: Record<string, string[]> = {
	"audio/mpeg": [".mp3", ".mpeg", ".mpga"],
	"audio/mp4": [".mp4", ".m4a"],
	"audio/wav": [".wav"],
	"audio/webm": [".webm"],
	"text/markdown": [".md", ".markdown"],
	"text/plain": [".txt"],
};

const LLAMACLOUD_FILE_TYPES: Record<string, string[]> = {
	// Office — Word
	"application/pdf": [".pdf"],
	"application/msword": [".doc"],
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document":
		[".docx"],
	"application/vnd.ms-word.document.macroEnabled.12": [".docm"],
	"application/msword-template": [".dot"],
	"application/vnd.ms-word.template.macroEnabled.12": [".dotm"],

	// Office — PowerPoint
	"application/vnd.ms-powerpoint": [".ppt"],
	"application/vnd.ms-powerpoint.template.macroEnabled.12": [".pptm"],
	"application/vnd.openxmlformats-officedocument.presentationml.presentation":
		[".pptx"],
	"application/vnd.ms-powerpoint.template": [".pot"],
	"application/vnd.openxmlformats-officedocument.presentationml.template":
		[".potx"],

	// Office — Excel
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
		".xlsx",
	],
	"application/vnd.ms-excel": [".xls"],
	"application/vnd.ms-excel.sheet.macroEnabled.12": [".xlsm"],
	"application/vnd.ms-excel.sheet.binary.macroEnabled.12": [".xlsb"],
	"application/vnd.ms-excel.workspace": [".xlw"],

	// Other document formats
	"application/rtf": [".rtf"],
	"application/xml": [".xml"],
	"application/epub+zip": [".epub"],

	// Apple iWork
	"application/vnd.apple.keynote": [".key"],
	"application/vnd.apple.pages": [".pages"],
	"application/vnd.apple.numbers": [".numbers"],

	// WordPerfect & OpenDocument
	"application/vnd.wordperfect": [".wpd"],
	"application/vnd.oasis.opendocument.text": [".odt"],
	"application/vnd.oasis.opendocument.presentation": [".odp"],
	"application/vnd.oasis.opendocument.graphics": [".odg"],
	"application/vnd.oasis.opendocument.spreadsheet": [".ods"],
	"application/vnd.oasis.opendocument.formula": [".fods"],

	// Data
	"text/csv": [".csv"],
	"text/tab-separated-values": [".tsv"],

	// Web
	"text/html": [".html", ".htm", ".web"],

	// Images
	"image/jpeg": [".jpg", ".jpeg"],
	"image/png": [".png"],
	"image/gif": [".gif"],
	"image/bmp": [".bmp"],
	"image/svg+xml": [".svg"],
	"image/tiff": [".tiff"],
	"image/webp": [".webp"],

	// Legacy / niche
	"application/dbase": [".dbf"],
	"application/vnd.lotus-1-2-3": [".123"],
	"text/x-web-markdown": [
		".602",
		".abw",
		".cgm",
		".cwk",
		".hwp",
		".lwp",
		".mw",
		".mcw",
		".pbd",
		".sda",
		".sdd",
		".sdp",
		".sdw",
		".sgl",
		".sti",
		".sxi",
		".sxw",
		".stw",
		".sxg",
		".uof",
		".uop",
		".uot",
		".vor",
		".wps",
		".zabw",
	],
	"text/x-spreadsheet": [
		".dif",
		".sylk",
		".slk",
		".prn",
		".et",
		".uos1",
		".uos2",
		".wk1",
		".wk2",
		".wk3",
		".wk4",
		".wks",
		".wq1",
		".wq2",
		".wb1",
		".wb2",
		".wb3",
		".qpw",
		".xlr",
		".eth",
	],

	// Audio (always supported)
	...audioFileTypes,
};

const DOCLING_FILE_TYPES: Record<string, string[]> = {
	"application/pdf": [".pdf"],
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document":
		[".docx"],
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
		".xlsx",
	],
	"application/vnd.openxmlformats-officedocument.presentationml.presentation":
		[".pptx"],
	"text/asciidoc": [".adoc", ".asciidoc"],
	"text/html": [".html", ".htm", ".xhtml"],
	"text/csv": [".csv"],
	"image/png": [".png"],
	"image/jpeg": [".jpg", ".jpeg"],
	"image/tiff": [".tiff", ".tif"],
	"image/bmp": [".bmp"],
	"image/webp": [".webp"],

	// Audio (always supported)
	...audioFileTypes,
};

/**
 * Returns the accepted file types map for the configured ETL service.
 * Used as the `accept` prop for file input / dropzone components.
 */
export function getAcceptedFileTypes(): Record<string, string[]> {
	const etlService =
		typeof window !== "undefined"
			? process.env.NEXT_PUBLIC_ETL_SERVICE
			: undefined;

	if (etlService === "LLAMACLOUD") {
		return LLAMACLOUD_FILE_TYPES;
	}
	return DOCLING_FILE_TYPES;
}

/**
 * Returns a flat sorted array of all supported file extensions
 * (e.g. [".csv", ".doc", ".docx", ...]).
 */
export function getSupportedExtensions(): string[] {
	return Array.from(
		new Set(Object.values(getAcceptedFileTypes()).flat()),
	).sort();
}

/**
 * Returns a comma-separated accept string suitable for an <input type="file">
 * that accepts images plus all document types.
 */
export function getChatAcceptString(): string {
	const docTypes = getAcceptedFileTypes();
	const parts: string[] = ["image/*"];
	for (const [mime, exts] of Object.entries(docTypes)) {
		if (mime.startsWith("image/")) continue;
		if (mime.startsWith("audio/")) {
			parts.push(mime);
			continue;
		}
		parts.push(mime);
		parts.push(...exts);
	}
	return Array.from(new Set(parts)).join(",");
}
