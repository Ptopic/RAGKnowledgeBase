import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import blogsClientRequests from "../authClientRequests";
import type { Blog } from "../types";
import { BLOG } from "@/shared/queryKeys";

const useGetBlog = (
	searchSpaceId: number | null | undefined,
	blogId: number | null | undefined,
	options?: UseQueryOptions<Blog, Error>,
) => {
	return useQuery<Blog, Error>({
		queryKey: [BLOG, searchSpaceId, blogId],
		queryFn: () => {
			if (!searchSpaceId) {
				throw new Error("Search space ID is required");
			}
			if (!blogId) {
				throw new Error("Blog ID is required");
			}
			return blogsClientRequests.getBlog(searchSpaceId, blogId);
		},
		enabled: !!searchSpaceId && !!blogId,
		...options,
	});
};

export default useGetBlog;
