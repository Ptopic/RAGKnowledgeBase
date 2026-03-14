export interface ImageCandidate {
	imageId: string;
	url: string;
	altText?: string;
	sectionHint?: string;
}

function normalizeUrl(rawUrl: string): string {
	return rawUrl.trim().replace(/^<|>$/g, "");
}

export function extractImageCandidatesFromMarkdown(
	markdown: string,
	maxImages = parseInt(process.env.IMAGE_MAX_PER_DOCUMENT || "20", 10),
): ImageCandidate[] {
	const candidates: ImageCandidate[] = [];
	const seen = new Set<string>();
	const lines = markdown.split("\n");
	let currentSection = "";
	let idx = 1;

	for (const line of lines) {
		const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
		if (headingMatch) {
			currentSection = headingMatch[1].trim();
		}

		const mdImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
		let mdMatch: RegExpExecArray | null;
		while ((mdMatch = mdImageRegex.exec(line)) !== null) {
			const altText = mdMatch[1]?.trim();
			const url = normalizeUrl(mdMatch[2] || "");
			if (!url || seen.has(url)) continue;
			seen.add(url);
			candidates.push({
				imageId: `img_${String(idx++).padStart(3, "0")}`,
				url,
				altText,
				sectionHint: currentSection || undefined,
			});
			if (candidates.length >= maxImages) return candidates;
		}

		const htmlImgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
		let htmlMatch: RegExpExecArray | null;
		while ((htmlMatch = htmlImgRegex.exec(line)) !== null) {
			const url = normalizeUrl(htmlMatch[1] || "");
			if (!url || seen.has(url)) continue;
			seen.add(url);
			candidates.push({
				imageId: `img_${String(idx++).padStart(3, "0")}`,
				url,
				sectionHint: currentSection || undefined,
			});
			if (candidates.length >= maxImages) return candidates;
		}
	}

	return candidates;
}
