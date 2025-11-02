import AuthPage from "@features/auth/AuthPage";
import { getMetadataTitle } from "@shared/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: getMetadataTitle("Sign In"),
};

const Auth = () => {
	return <AuthPage />;
};

export default Auth;
