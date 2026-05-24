"use client";
import { type Tag, TagInput } from "emblor";
import { Globe, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import useCrawlWebpages from "@/api/documents/hooks/useCrawlWebpages";
import useGetSearchSpace from "@/api/searchspaces/hooks/useGetSearchSpace";
import { AccessDeniedPage } from "@/components/access-denied-page";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function WebpageCrawler() {
	const params = useParams();
	const router = useRouter();
	const search_space_id = params.search_space_id as string;

	const { data: searchSpaceData } = useGetSearchSpace(Number(search_space_id));

	const [urlTags, setUrlTags] = useState<Tag[]>([]);
	const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	const { mutate: crawlWebpages, isPending: isSubmitting } = useCrawlWebpages({
		onSuccess: () => {
			router.push(`/dashboard/${search_space_id}/documents`);
		},
	});

	if (searchSpaceData && searchSpaceData.role === "VIEWER" && !searchSpaceData.is_owner) {
		return <AccessDeniedPage />;
	}

	// Function to validate a URL
	const isValidUrl = (url: string): boolean => {
		try {
			const parsed = new URL(url);
			return parsed.protocol === "http:" || parsed.protocol === "https:";
		} catch {
			return false;
		}
	};

	// Function to handle URL submission
	const handleSubmit = () => {
		// Validate that we have at least one URL
		if (urlTags.length === 0) {
			setError("Please add at least one URL");
			return;
		}

		// Validate all URLs
		const invalidUrls = urlTags.filter((tag) => !isValidUrl(tag.text));
		if (invalidUrls.length > 0) {
			setError(
				`Invalid URLs: ${invalidUrls.map((tag) => tag.text).join(", ")}`,
			);
			return;
		}

		setError(null);

		// Extract URLs from tags
		const urls = urlTags.map((tag) => tag.text);

		crawlWebpages({
			document_type: "CRAWLED_URL",
			content: urls,
			search_space_id: parseInt(search_space_id),
		});
	};

	// Function to add a new URL tag
	const handleAddTag = (text: string) => {
		// Basic URL validation
		if (!isValidUrl(text)) {
			toast("Invalid URL", {
				description: "Please enter a valid URL",
			});
			return;
		}

		// Check for duplicates
		if (urlTags.some((tag) => tag.text === text)) {
			toast("Duplicate URL", {
				description: "This URL has already been added",
			});
			return;
		}

		// Add the new tag
		const newTag: Tag = {
			id: Date.now().toString(),
			text: text,
		};

		setUrlTags([...urlTags, newTag]);
	};

	return (
		<div className="container mx-auto py-8">
			<Card className="max-w-2xl mx-auto">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Globe className="h-5 w-5" />
						Add Webpages
					</CardTitle>
					<CardDescription>
						Crawl webpages and add them to your knowledge base
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="url-input">Webpage URLs</Label>
							<TagInput
								id="url-input"
								tags={urlTags}
								setTags={setUrlTags}
								placeholder="Enter webpage URL (e.g., https://example.com)"
								onAddTag={handleAddTag}
								styleClasses={{
									inlineTagsContainer:
										"border-input rounded-lg bg-background shadow-sm shadow-black/5 transition-shadow focus-within:border-ring focus-within:outline-none focus-within:ring-[3px] focus-within:ring-ring/20 p-1 gap-1",
									input:
										"w-full min-w-[80px] focus-visible:outline-none shadow-none px-2 h-7",
									tag: {
										body: "h-7 relative bg-background border border-input hover:bg-background rounded-md font-medium text-xs ps-2 pe-7 flex",
										closeButton:
											"absolute -inset-y-px -end-px p-0 rounded-e-lg flex size-7 transition-colors outline-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 text-muted-foreground/80 hover:text-foreground",
									},
								}}
								activeTagIndex={activeTagIndex}
								setActiveTagIndex={setActiveTagIndex}
							/>
							<p className="text-xs text-muted-foreground mt-1">
								Paste URLs and press Enter to add them
							</p>
						</div>

						{error && <div className="text-sm text-red-500 mt-2">{error}</div>}

						<div className="bg-muted/50 rounded-lg p-4 text-sm">
							<h4 className="font-medium mb-2">Tips</h4>
							<ul className="list-disc pl-5 space-y-1 text-muted-foreground">
								<li>Use full URLs starting with http:// or https://</li>
								<li>You can add multiple URLs at once</li>
								<li>Webpages will be crawled in the background</li>
								<li>Check the documents page to see crawling status</li>
							</ul>
						</div>
					</div>
				</CardContent>
				<CardFooter className="flex justify-between">
					<Button
						variant="outline"
						onClick={() =>
							router.push(`/dashboard/${search_space_id}/documents`)
						}
					>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={isSubmitting || urlTags.length === 0}
					>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Crawling
							</>
						) : (
							"Add Webpages"
						)}
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
