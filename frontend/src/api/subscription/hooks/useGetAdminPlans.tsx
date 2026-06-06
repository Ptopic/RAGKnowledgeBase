import { useQuery } from "@tanstack/react-query";
import { ADMIN_PLANS } from "@/shared/queryKeys";
import subscriptionClientRequests from "../authClientRequests";
import type { AdminPlanDefinitionList } from "../types";

const useGetAdminPlans = () => {
	return useQuery<AdminPlanDefinitionList, Error>({
		queryKey: [ADMIN_PLANS],
		queryFn: () => subscriptionClientRequests.getAdminPlans(),
	});
};

export default useGetAdminPlans;
