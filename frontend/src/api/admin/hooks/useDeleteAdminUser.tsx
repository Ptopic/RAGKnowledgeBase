import {
	type UseMutationOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { ADMIN_METRICS, ADMIN_USERS } from "@/shared/queryKeys";
import adminClientRequests from "../authClientRequests";

const useDeleteAdminUser = (
	options?: UseMutationOptions<
		{ message: string },
		Error,
		string,
		unknown
	>,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => adminClientRequests.deleteAdminUser(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [ADMIN_USERS] });
			queryClient.invalidateQueries({ queryKey: [ADMIN_METRICS] });
		},
		onError: (error) => {
			toast.error(error.message || "Failed to delete user");
		},
		...options,
	});
};

export default useDeleteAdminUser;
