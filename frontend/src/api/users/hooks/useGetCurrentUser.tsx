import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import usersClientRequests from "../authClientRequests";
import type { User } from "../types";

const useGetCurrentUser = (
	options?: Omit<
		UseQueryOptions<User, Error, User, readonly unknown[]>,
		"queryKey" | "queryFn"
	>
) => {
	return useQuery<User, Error>({
		queryKey: ["currentUser"],
		queryFn: () => usersClientRequests.getCurrentUser(),
		...options,
	});
};

export default useGetCurrentUser;
