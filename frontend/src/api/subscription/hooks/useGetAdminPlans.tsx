import { useQuery } from "@tanstack/react-query";
import subscriptionClientRequests from "../authClientRequests";
import type { AdminPlanDefinitionList } from "../types";

const ADMIN_PLANS = ["admin-plans"] as const;

const useGetAdminPlans = () => {
	return useQuery<AdminPlanDefinitionList, Error>({
		queryKey: [ADMIN_PLANS],
		queryFn: () => subscriptionClientRequests.getAdminPlans(),
	});
};

export default useGetAdminPlans;
