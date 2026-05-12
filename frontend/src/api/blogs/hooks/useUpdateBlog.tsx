import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { BLOG, BLOGS } from "@/shared/queryKeys";
import blogsClientRequests from "../authClientRequests";
import type { Blog, UpdateBlogRequest } from "../types";

interface UpdateBlogParams {
	searchSpaceId: number;
	blogId: number;
	data: UpdateBlogRequest;
}

const useUpdateBlog = (
	options?: UseMutationOptions<Blog, Error, UpdateBlogParams, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ searchSpaceId, blogId, data }: UpdateBlogParams) =>
			blogsClientRequests.updateBlog(searchSpaceId, blogId, data),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [BLOGS] });
			queryClient.invalidateQueries({ queryKey: [BLOG] });
		},
		onError: (error) => {
			console.error("Error updating blog:", error);
		},
		...options,
	});
};

export default useUpdateBlog;
