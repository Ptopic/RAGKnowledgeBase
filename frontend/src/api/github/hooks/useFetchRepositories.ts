import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import githubClientRequests from "../authClientRequests";
import type { FetchRepositoriesRequest, GithubRepo } from "../types";

const useFetchRepositories = (
	options?: UseMutationOptions<
		GithubRepo[],
		Error,
		FetchRepositoriesRequest,
		unknown
	>,
) => {
	return useMutation({
		mutationFn: (data: FetchRepositoriesRequest) =>
			githubClientRequests.fetchRepositories(data),
		onSuccess: (data) => {
			toast.success(`Found ${data.length} repositories.`);
		},
		onError: (error) => {
			console.error("Error fetching GitHub repositories:", error);
			const errorMessage =
				error instanceof Error
					? error.message
					: "Failed to fetch repositories. Please check the PAT and try again.";
			toast.error(errorMessage);
		},
		...options,
	});
};

export default useFetchRepositories;
