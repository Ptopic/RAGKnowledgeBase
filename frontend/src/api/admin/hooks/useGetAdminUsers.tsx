import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { ADMIN_USERS } from "@/shared/queryKeys";
import adminClientRequests from "../authClientRequests";
import type { AdminUserList } from "../types";

const useGetAdminUsers = (
	params: { skip?: number; limit?: number; search?: string },
	options?: Omit<
		UseQueryOptions<AdminUserList, Error, AdminUserList, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) => {
	return useQuery<AdminUserList, Error>({
		queryKey: [ADMIN_USERS, params],
		queryFn: () => adminClientRequests.getAdminUsers(params),
		...options,
	});
};

export default useGetAdminUsers;
