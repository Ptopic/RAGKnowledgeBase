import { getMetadataTitle } from "@shared/utils";
import type { Metadata } from "next";
import ForgotPasswordPage from "@features/auth/ForgotPasswordPage";

export const metadata: Metadata = {
	title: getMetadataTitle("Forgot Password"),
};

const ForgotPassword = () => {
	return <ForgotPasswordPage />;
};

export default ForgotPassword;