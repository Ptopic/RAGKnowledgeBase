import { Suspense } from "react";

import InviteAcceptPage from "@features/auth/InviteAcceptPage";

const InvitePage = () => {
	return (
		<Suspense fallback={null}>
			<InviteAcceptPage />
		</Suspense>
	);
};

export default InvitePage;
