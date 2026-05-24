import AuthPage from "@features/auth/AuthPage";
import { getMetadataTitle } from "@shared/utils";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: getMetadataTitle("Sign In"),
};

const Auth = () => {
	return (
		<Suspense>
			<AuthPage />
		</Suspense>
	);
};

export default Auth;
