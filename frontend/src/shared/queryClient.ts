import { QueryClient } from "@tanstack/react-query";
import { cache } from "react";

export const queryClientDefaultOptions = {
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh for 5 minutes
			retry: false,
			refetchOnWindowFocus: false,
		},
		mutations: {
			retry: false,
		},
	},
};

export const getSSRQueryClient = cache(
	() =>
		new QueryClient({
			...queryClientDefaultOptions,
		}),
);
