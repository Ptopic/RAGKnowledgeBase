import { UseMutationOptions, useMutation } from "@tanstack/react-query";
import authClientRequests from "../authClientRequests";
import type { IForgotPasswordData, IMessageResponse } from "../types";

const useForgotPassword = (
	options?: UseMutationOptions<IMessageResponse, Error, IForgotPasswordData, unknown>,
) => {
	return useMutation<IMessageResponse, Error, IForgotPasswordData, unknown>({
		mutationFn: (data: IForgotPasswordData) =>
			authClientRequests.forgotPassword(data),
		...options,
	});
};

export default useForgotPassword;