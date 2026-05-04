import { UseMutationOptions, useMutation } from "@tanstack/react-query";
import authClientRequests from "../authClientRequests";
import type { IMessageResponse, IResetPasswordData } from "../types";

const useResetPassword = (
	options?: UseMutationOptions<IMessageResponse, Error, IResetPasswordData, unknown>,
) => {
	return useMutation<IMessageResponse, Error, IResetPasswordData, unknown>({
		mutationFn: (data: IResetPasswordData) =>
			authClientRequests.resetPassword(data),
		...options,
	});
};

export default useResetPassword;