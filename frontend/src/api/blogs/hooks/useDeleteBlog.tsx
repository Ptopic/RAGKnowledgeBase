import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { BLOGS } from "@/shared/queryKeys";
import blogsClientRequests from "../authClientRequests";

interface DeleteBlogParams {
	searchSpaceId: number;
	blogId: number;
}

const useDeleteBlog = (
	options?: UseMutationOptions<void, Error, DeleteBlogParams, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ searchSpaceId, blogId }: DeleteBlogParams) =>
			blogsClientRequests.deleteBlog(searchSpaceId, blogId),
		onSuccess: () => {
			toast.success("Blog deleted successfully");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: [BLOGS] });
		},
		onError: (error) => {
			console.error("Error deleting blog:", error);
			toast.error(error.message || "An error occurred while deleting the blog");
		},
		...options,
	});
};

export default useDeleteBlog;
