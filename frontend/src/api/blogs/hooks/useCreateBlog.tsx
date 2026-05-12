import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { BLOGS } from "@/shared/queryKeys";
import blogsClientRequests from "../authClientRequests";
import type { Blog, CreateBlogRequest } from "../types";

interface CreateBlogParams {
	searchSpaceId: number;
	data: Omit<CreateBlogRequest, "search_space_id">;
}

const useCreateBlog = (
	options?: UseMutationOptions<Blog, Error, CreateBlogParams, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ searchSpaceId, data }: CreateBlogParams) =>
			blogsClientRequests.createBlog(searchSpaceId, data),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [BLOGS] });
		},
		onError: (error) => {
			console.error("Error creating blog:", error);
			toast.error(error.message || "An error occurred while creating the blog");
		},
		...options,
	});
};

export default useCreateBlog;
