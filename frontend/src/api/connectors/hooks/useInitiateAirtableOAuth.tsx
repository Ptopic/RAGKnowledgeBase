import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import connectorsClientRequests from "../authClientRequests";
import type { InitiateOAuthParams, OAuthResponse } from "../types";

const useInitiateAirtableOAuth = (
	options?: UseMutationOptions<
		OAuthResponse,
		Error,
		InitiateOAuthParams,
		unknown
	>,
) => {
	return useMutation({
		mutationFn: (params: InitiateOAuthParams) =>
			connectorsClientRequests.initiateAirtableOAuth(params),
		onSuccess: (data) => {
			// Redirect to Airtable for authentication
			window.location.href = data.auth_url;
		},
		onError: (error) => {
			console.error("Error connecting to Airtable:", error);
			toast.error("Failed to connect to Airtable");
		},
		...options,
	});
};

export default useInitiateAirtableOAuth;
