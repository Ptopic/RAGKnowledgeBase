import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import notebooksClientRequests from "../authClientRequests";
import type { PublicNotebook } from "../types";
import { PUBLIC_NOTEBOOK } from "@/shared/queryKeys";

const useGetPublicNotebookBySlug = (
	slug: string | undefined,
	options?: UseQueryOptions<PublicNotebook, Error>,
) => {
	return useQuery<PublicNotebook, Error>({
		queryKey: [PUBLIC_NOTEBOOK, slug],
		queryFn: () => notebooksClientRequests.getPublicNotebookBySlug(slug!),
		enabled: !!slug,
		retry: false,
		...options,
	});
};

export default useGetPublicNotebookBySlug;
