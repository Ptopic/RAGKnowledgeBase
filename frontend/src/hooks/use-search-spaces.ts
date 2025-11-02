"use client";

import useGetSearchSpaces from "@api/searchspaces/hooks/useGetSearchSpaces";
import { useCallback } from "react";

// Re-export types for backward compatibility
export type { SearchSpace } from "@api/searchspaces/types";

export function useSearchSpaces() {
	const {
		data: searchSpaces = [],
		isLoading: loading,
		error,
		refetch,
	} = useGetSearchSpaces();

	// Function to refresh the search spaces list
	const refreshSearchSpaces = useCallback(async () => {
		const { data } = await refetch();
		return data;
	}, [refetch]);

	return {
		searchSpaces,
		loading,
		error: error ? error.message : null,
		refreshSearchSpaces,
	};
}
