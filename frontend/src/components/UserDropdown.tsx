"use client";

import { BadgeCheck, LogOut, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { removeAuthToken } from "@/shared/utils/authClient";

export function UserDropdown({
	user,
	isSuperuser = false,
}: {
	user: {
		name: string;
		email: string;
		avatar: string;
	};
	isSuperuser?: boolean;
}) {
	const router = useRouter();

	const handleLogout = () => {
		try {
			if (typeof window !== "undefined") {
				removeAuthToken();
				router.push("/");
			}
		} catch (error) {
			console.error("Error during logout:", error);
			if (typeof window !== "undefined") {
				alert("Logout failed. Please try again.");
				router.push("/");
			}
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="relative h-10 w-10 rounded-full">
					<Avatar className="h-8 w-8">
						<AvatarImage src={user.avatar} alt={user.name} />
						<AvatarFallback>{user.name.charAt(0)?.toUpperCase() || "?"}</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end" forceMount>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-1">
						<p className="text-sm font-medium leading-none">{user.name}</p>
						<p className="text-xs leading-none text-muted-foreground">{user.email}</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					{isSuperuser && (
						<DropdownMenuItem onClick={() => router.push("/admin/users")}>
							<Shield className="mr-2 h-4 w-4" />
							Admin Dashboard
						</DropdownMenuItem>
					)}
					<DropdownMenuItem onClick={() => router.push(`/dashboard/api-key`)}>
						<BadgeCheck className="mr-2 h-4 w-4" />
						API Key
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleLogout}>
					<LogOut className="mr-2 h-4 w-4" />
					Log out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
