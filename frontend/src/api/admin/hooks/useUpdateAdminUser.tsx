import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { ADMIN_METRICS, ADMIN_USERS, CURRENT_USER } from "@/shared/queryKeys";
import adminClientRequests from "../authClientRequests";
import type { UpdateAdminUser, AdminUser } from "../types";

const useUpdateAdminUser = (
	options?: UseMutationOptions<
		AdminUser,
		Error,
		{ id: string; data: UpdateAdminUser },
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateAdminUser }) =>
			adminClientRequests.updateAdminUser(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [ADMIN_USERS] });
			queryClient.invalidateQueries({ queryKey: [ADMIN_METRICS] });
			queryClient.invalidateQueries({ queryKey: [CURRENT_USER] });
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update user");
		},
		...options,
	});
};

export default useUpdateAdminUser;
