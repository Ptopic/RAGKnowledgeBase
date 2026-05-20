import { ImageIcon, ExternalLink } from "lucide-react";
import Image from "next/image";

interface ImageChunkData {
	imageId: string;
	sourceUrl: string;
	altText: string;
	shortCaption: string;
	description: string;
	ocrText: string;
	chartOrTableSummary: string;
	entities: string;
	containsText: boolean;
	isDecorative: boolean;
	confidence: number;
}

function parseImageChunk(xml: string): ImageChunkData | null {
	const get = (tag: string) => {
		const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
		return m?.[1]?.trim() || "";
	};

	if (!get("image_id")) return null;

	return {
		imageId: get("image_id"),
		sourceUrl: get("source_url"),
		altText: get("alt_text"),
		shortCaption: get("short_caption"),
		description: get("description"),
		ocrText: get("ocr_text"),
		chartOrTableSummary: get("chart_or_table_summary"),
		entities: get("entities"),
		containsText: get("contains_text") === "true",
		isDecorative: get("is_decorative") === "true",
		confidence: parseFloat(get("confidence")) || 0,
	};
}

export function isImageChunk(content: string): boolean {
	return content.trimStart().startsWith("<image_chunk>");
}

export function renderChunkContent(content: string): {
	isImage: boolean;
	imageData: ImageChunkData | null;
	text: string;
} {
	if (isImageChunk(content)) {
		return { isImage: true, imageData: parseImageChunk(content), text: content };
	}
	return { isImage: false, imageData: null, text: content };
}

interface ImageChunkCardProps {
	content: string;
	className?: string;
}

export function ImageChunkCard({ content, className }: ImageChunkCardProps) {
	const parsed = parseImageChunk(content);

	if (!parsed) {
		return (
			<div className={className}>
				<pre className="text-xs text-muted-foreground whitespace-pre-wrap">{content}</pre>
			</div>
		);
	}

	return (
		<div className={className}>
			<div className="flex items-start gap-3">
				{parsed.sourceUrl ? (
					<Image
						src={parsed.sourceUrl}
						alt={parsed.altText || parsed.shortCaption || "Image"}
						width={200}
						height={150}
						className="rounded border max-w-[200px] h-auto object-cover shrink-0"
						unoptimized
					/>
				) : (
					<div className="flex items-center justify-center w-[200px] h-[150px] rounded border bg-muted shrink-0">
						<ImageIcon className="h-8 w-8 text-muted-foreground" />
					</div>
				)}
				<div className="flex-1 min-w-0 space-y-1.5">
					{parsed.shortCaption && (
						<div className="text-sm font-medium">{parsed.shortCaption}</div>
					)}
					{parsed.description && (
						<div className="text-sm text-muted-foreground">{parsed.description}</div>
					)}
					{parsed.ocrText && (
						<div className="text-xs text-muted-foreground italic">OCR: {parsed.ocrText}</div>
					)}
					{parsed.chartOrTableSummary && (
						<div className="text-xs text-muted-foreground">
							Chart/Table: {parsed.chartOrTableSummary}
						</div>
					)}
					{parsed.entities && (
						<div className="text-xs text-muted-foreground">
							Entities: {parsed.entities}
						</div>
					)}
					<div className="flex items-center gap-2 pt-1">
						{parsed.sourceUrl && (
							<a
								href={parsed.sourceUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
							>
								<ExternalLink className="h-3 w-3" />
								Source
							</a>
						)}
						<span className="text-xs text-muted-foreground">
							Confidence: {Math.round(parsed.confidence * 100)}%
						</span>
						{parsed.isDecorative && (
							<span className="text-xs bg-muted px-1.5 py-0.5 rounded">Decorative</span>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
