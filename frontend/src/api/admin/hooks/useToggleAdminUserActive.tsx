import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { ADMIN_METRICS, ADMIN_USERS } from "@/shared/queryKeys";
import adminClientRequests from "../authClientRequests";
import type { AdminUser } from "../types";

const useToggleAdminUserActive = (
	options?: UseMutationOptions<AdminUser, Error, string, unknown>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => adminClientRequests.toggleAdminUserActive(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [ADMIN_USERS] });
			queryClient.invalidateQueries({ queryKey: [ADMIN_METRICS] });
		},
		onError: (error) => {
			toast.error(error.message || "Failed to toggle user status");
		},
		...options,
	});
};

export default useToggleAdminUserActive;
