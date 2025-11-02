import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import authClientRequests from "../authClientRequests";
import type { IGoogleAuthResponse, IGoogleLoginData } from "../types";

const useGoogleLogin = (
	options?: UseMutationOptions<
		IGoogleAuthResponse,
		Error,
		IGoogleLoginData,
		unknown
	>,
) => {
	return useMutation<IGoogleAuthResponse, Error, IGoogleLoginData, unknown>({
		mutationFn: (data: IGoogleLoginData) =>
			authClientRequests.loginWithGoogle(data),
		...options,
	});
};

export default useGoogleLogin;
