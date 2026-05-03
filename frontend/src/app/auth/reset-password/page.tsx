import { Suspense } from "react";
import ResetPasswordPage from "@features/auth/ResetPasswordPage";

const ResetPassword = () => {
	return (
		<Suspense fallback={null}>
			<ResetPasswordPage />
		</Suspense>
	);
};

export default ResetPassword;