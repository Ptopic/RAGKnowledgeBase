import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import blogsClientRequests from "../authClientRequests";
import type { BlogListItem, GetBlogsParams } from "../types";
import { BLOGS } from "@/shared/queryKeys";

const useGetBlogs = (
	params: GetBlogsParams,
	options?: Omit<
		UseQueryOptions<BlogListItem[], Error, BlogListItem[], readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<BlogListItem[], Error>({
		queryKey: [BLOGS, params.search_space_id],
		queryFn: () => blogsClientRequests.getBlogs(params),
		...options,
	});
};

export default useGetBlogs;
