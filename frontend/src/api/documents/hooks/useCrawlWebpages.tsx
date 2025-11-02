import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import documentsClientRequests from "../authClientRequests";
import type { CrawlWebpagesRequest, CrawlWebpagesResponse } from "../types";

const useCrawlWebpages = (
	options?: UseMutationOptions<
		CrawlWebpagesResponse,
		Error,
		CrawlWebpagesRequest,
		unknown
	>,
) => {
	return useMutation({
		mutationFn: (data: CrawlWebpagesRequest) =>
			documentsClientRequests.crawlWebpages(data),
		onMutate: () => {
			toast("Crawling webpages", {
				description: "Your URLs are being crawled...",
			});
		},
		onSuccess: () => {
			toast("Success", {
				description: "Webpages crawled successfully",
			});
		},
		onError: (error) => {
			console.error("Error crawling webpages:", error);
			toast("Error", {
				description: `Failed to crawl URLs: ${error.message}`,
			});
		},
		...options,
	});
};

export default useCrawlWebpages;
