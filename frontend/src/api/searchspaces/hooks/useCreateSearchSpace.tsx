import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SEARCH_SPACES } from "@/shared/queryKeys";
import searchSpacesClientRequests from "../authClientRequests";
import type {
	CreateSearchSpaceRequest,
	CreateSearchSpaceResponse,
} from "../types";

const useCreateSearchSpace = (
	options?: UseMutationOptions<
		CreateSearchSpaceResponse,
		Error,
		CreateSearchSpaceRequest,
		unknown
	>,
) => {
	const queryClient = useQueryClient();
	const router = useRouter();

	return useMutation({
		mutationFn: (data: CreateSearchSpaceRequest) =>
			searchSpacesClientRequests.createSearchSpace(data),
		onSuccess: (_, variables) => {
			toast.success("Search space created successfully", {
				description: `"${variables.name}" has been created.`,
			});
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [SEARCH_SPACES] });
			router.push("/dashboard");
		},
		onError: (error) => {
			console.error("Error creating search space:", error);
			toast.error(
				error.message || "An error occurred while creating the search space",
			);
		},
		...options,
	});
};

export default useCreateSearchSpace;
