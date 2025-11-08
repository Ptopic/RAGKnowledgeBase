import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import connectorsClientRequests from "../authClientRequests";
import type { InitiateOAuthParams, OAuthResponse } from "../types";

const useInitiateGoogleCalendarOAuth = (
	options?: UseMutationOptions<
		OAuthResponse,
		Error,
		InitiateOAuthParams,
		unknown
	>,
) => {
	return useMutation({
		mutationFn: (params: InitiateOAuthParams) =>
			connectorsClientRequests.initiateGoogleCalendarOAuth(params),
		onSuccess: (data) => {
			window.location.href = data.auth_url;
		},
		onError: (error) => {
			console.error("Error connecting to Google:", error);
			toast.error("Failed to connect to Google Calendar");
		},
		...options,
	});
};

export default useInitiateGoogleCalendarOAuth;
