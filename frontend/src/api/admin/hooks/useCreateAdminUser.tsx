import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { ADMIN_METRICS, ADMIN_USERS } from "@/shared/queryKeys";
import adminClientRequests from "../authClientRequests";
import type { CreateAdminUser, AdminUser } from "../types";

const useCreateAdminUser = (
	options?: UseMutationOptions<AdminUser, Error, CreateAdminUser, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateAdminUser) =>
			adminClientRequests.createAdminUser(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [ADMIN_USERS] });
			queryClient.invalidateQueries({ queryKey: [ADMIN_METRICS] });
		},
		onError: (error) => {
			toast.error(error.message || "Failed to create user");
		},
		...options,
	});
};

export default useCreateAdminUser;
