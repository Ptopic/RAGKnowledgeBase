import type React from "react";
import { AdminClientLayout } from "./client-layout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return <AdminClientLayout>{children}</AdminClientLayout>;
}
