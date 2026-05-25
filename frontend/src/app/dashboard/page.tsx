"use client";
import { AlertCircle, CircleX, Loader2, LogOut, Plus, Search, Trash2 } from "lucide-react";
import { motion, type Variants } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import useDeleteSearchSpace from "@/api/searchspaces/hooks/useDeleteSearchSpace";
import useGetSearchSpaces from "@/api/searchspaces/hooks/useGetSearchSpaces";
import useLeaveSearchSpace from "@/api/searchspaces/hooks/useLeaveSearchSpace";
import type { MemberRole } from "@/api/searchspaces/types";
import useGetCurrentUser from "@/api/users/hooks/useGetCurrentUser";
import { Logo } from "@/components/Logo";
import { ThemeTogglerComponent } from "@/components/theme/theme-toggle";
import { UserDropdown } from "@/components/UserDropdown";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spotlight } from "@/components/ui/spotlight";
import { Tilt } from "@/components/ui/tilt";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDateString } from "@/shared/utils/date";

const roleBadgeVariant = (role: MemberRole) => {
	switch (role) {
		case "OWNER":
			return "default" as const;
		case "EDITOR":
			return "secondary" as const;
		case "VIEWER":
			return "outline" as const;
	}
};

const LoadingScreen = () => {
	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
			<motion.div
				initial={{ opacity: 0, scale: 0.8 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.5 }}
			>
				<Card className="w-[350px] bg-background/60 backdrop-blur-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-xl font-medium">{"Loading"}</CardTitle>
						<CardDescription>{"Fetching spaces"}</CardDescription>
					</CardHeader>
					<CardContent className="flex justify-center py-6">
						<motion.div
							animate={{ rotate: 360 }}
							transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
						>
							<Loader2 className="h-12 w-12 text-primary" />
						</motion.div>
					</CardContent>
					<CardFooter className="border-t pt-4 text-sm text-muted-foreground">
						{"May take moment"}
					</CardFooter>
				</Card>
			</motion.div>
		</div>
	);
};

const ErrorScreen = ({ message }: { message: string }) => {
	const router = useRouter();

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
			>
				<Card className="w-[400px] bg-background/60 backdrop-blur-sm border-destructive/20">
					<CardHeader className="pb-2">
						<div className="flex items-center gap-2">
							<AlertCircle className="h-5 w-5 text-destructive" />
							<CardTitle className="text-xl font-medium">{"Error"}</CardTitle>
						</div>
						<CardDescription>{"Something wrong"}</CardDescription>
					</CardHeader>
					<CardContent>
						<Alert
							variant="destructive"
							className="bg-destructive/10 border-destructive/30"
						>
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>{"Error details"}</AlertTitle>
							<AlertDescription className="mt-2">{message}</AlertDescription>
						</Alert>
					</CardContent>
					<CardFooter className="flex justify-end gap-2 border-t pt-4">
						<Button variant="outline" onClick={() => router.refresh()}>
							{"Try again"}
						</Button>
						<Button onClick={() => router.push("/")}>{"Go home"}</Button>
					</CardFooter>
				</Card>
			</motion.div>
		</div>
	);
};

const SEARCH_DEBOUNCE_MS = 400;

const DashboardPage = () => {
	const containerVariants: Variants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.1,
			},
		},
	};

	const itemVariants: Variants = {
		hidden: { y: 20, opacity: 0 },
		visible: {
			y: 0,
			opacity: 1,
			transition: {
				type: "spring",
				stiffness: 300,
				damping: 24,
			},
		},
	};

	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);
	const searchInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				searchInputRef.current?.focus();
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, []);

	const {
		data: searchSpaces,
		isLoading: loading,
		isFetching: fetching,
		error,
		refetch: refreshSearchSpaces,
	} = useGetSearchSpaces({
		q: debouncedSearch.trim() || undefined,
	});

	const { mutate: deleteSearchSpace } =
		useDeleteSearchSpace({
			onSuccess: () => {
				refreshSearchSpaces();
			},
		});

	const { mutate: leaveSearchSpace } =
		useLeaveSearchSpace({
			onSuccess: () => {
				refreshSearchSpaces();
			},
		});

	const {
		data: user,
		isLoading: isLoadingUser,
		error: userError,
	} = useGetCurrentUser();

	const customUser = {
		name: user?.email ? user.email.split("@")[0] : "User",
		email:
			user?.email ||
			(isLoadingUser
				? "Loading..."
				: userError
					? "Error loading user"
					: "Unknown User"),
		avatar: "/icon-128.png",
	};

	if (loading && !searchSpaces) return <LoadingScreen />;
	if (error && !searchSpaces) return <ErrorScreen message={error.toString()} />;

	const ownedSpaces = searchSpaces?.filter((space) => space.is_owner) ?? [];
	const sharedSpaces = searchSpaces?.filter((space) => !space.is_owner) ?? [];

	const handleDeleteSearchSpace = (id: number) => {
		deleteSearchSpace(id);
	};

	const handleLeaveSearchSpace = (id: number) => {
		leaveSearchSpace(id);
	};

	const renderSpaceCard = (space: (typeof searchSpaces)[0], isShared: boolean) => (
		<motion.div
			key={space.id}
			variants={itemVariants}
			className="aspect-[4/3]"
		>
			<Tilt
				rotationFactor={6}
				isRevese
				springOptions={{
					stiffness: 26.7,
					damping: 4.1,
					mass: 0.2,
				}}
				className="group relative rounded-lg h-full"
			>
				<Spotlight
					className="z-10 from-blue-500/20 via-blue-300/10 to-blue-200/5 blur-2xl"
					size={248}
					springOptions={{
						stiffness: 26.7,
						damping: 4.1,
						mass: 0.2,
					}}
				/>
				<div className="flex flex-col h-full justify-between overflow-hidden rounded-xl border bg-muted/30 backdrop-blur-sm transition-all hover:border-primary/50">
					<div className="relative h-32 w-full overflow-hidden">
						<Link
							href={`/dashboard/${space.id}/documents`}
							key={space.id}
						>
							<Image
								src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80"
								alt={space.name}
								className="h-full w-full object-cover grayscale duration-700 group-hover:grayscale-0"
								width={248}
								height={248}
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
						</Link>
						<div className="absolute top-2 right-2 flex items-center gap-1">
							{isShared && space.role && (
								<Badge variant={roleBadgeVariant(space.role)}>
									{space.role}
								</Badge>
							)}
							{!isShared && (
								<div>
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm hover:bg-destructive/90 cursor-pointer"
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>
													{"Delete search space"}
												</AlertDialogTitle>
												<AlertDialogDescription>
													{"Delete space confirm"} {space.name}
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>
													{"Cancel"}
												</AlertDialogCancel>
												<AlertDialogAction
													onClick={() =>
														handleDeleteSearchSpace(space.id)
													}
													className="bg-destructive hover:bg-destructive/90"
												>
													{"Delete"}
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</div>
							)}
							{isShared && (
								<div>
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm hover:bg-destructive/90 cursor-pointer"
											>
												<LogOut className="h-4 w-4" />
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>
													{"Leave search space"}
												</AlertDialogTitle>
												<AlertDialogDescription>
													{"Are you sure you want to leave"} {space.name}? {"You will lose access to this search space."}
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>
													{"Cancel"}
												</AlertDialogCancel>
												<AlertDialogAction
													onClick={() =>
														handleLeaveSearchSpace(space.id)
													}
													className="bg-destructive hover:bg-destructive/90"
												>
													{"Leave"}
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</div>
							)}
						</div>
					</div>
					<Link
						className="flex flex-1 flex-col p-4 cursor-pointer"
						href={`/dashboard/${space.id}/documents`}
						key={space.id}
					>
						<div className="flex flex-1 flex-col justify-between p-1">
							<div>
								<h3 className="font-medium text-lg">
									{space.name}
								</h3>
								<p className="mt-1 text-sm text-muted-foreground">
									{space.description}
								</p>
							</div>
							<div className="mt-4  text-xs text-muted-foreground">
								<span>
									{"Created"} {formatDateString(space.created_at)}
								</span>
							</div>
						</div>
					</Link>
				</div>
			</Tilt>
		</motion.div>
	);

	return (
		<motion.div
			className="container mx-auto py-10"
			initial="hidden"
			animate="visible"
			variants={containerVariants}
		>
			<motion.div className="flex flex-col space-y-6" variants={itemVariants}>
				<div className="flex flex-row space-x-4 justify-between">
					<div className="flex flex-row space-x-4">
						<Logo className="w-10 h-10 rounded-md" />
						<div className="flex flex-col space-y-2">
							<h1 className="text-4xl font-bold">{"Dashboard"}</h1>
							<p className="text-muted-foreground">{"Welcome message"}</p>
						</div>
					</div>

					<div className="flex items-center space-x-3">
						<UserDropdown user={customUser} />
						<ThemeTogglerComponent />
					</div>
				</div>

				<div className="flex flex-col space-y-6 mt-6">
					<div className="flex flex-wrap justify-between items-center gap-3">
						<h2 className="text-2xl font-semibold">{"Your search spaces"}</h2>
						<div className="flex items-center gap-3">
							<motion.div
								className="relative"
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ type: "spring", stiffness: 300, damping: 30 }}
							>
								<Input
									ref={searchInputRef}
									className="peer min-w-60 ps-9 pe-9"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Search knowledge bases... ⌘K"
									type="text"
									aria-label="Search knowledge bases"
								/>
								<div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
									<Search size={16} strokeWidth={2} aria-hidden="true" />
								</div>
								{Boolean(search) && (
									<button
										className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground"
										aria-label="Clear search"
										onClick={() => {
											setSearch("");
											searchInputRef.current?.focus();
										}}
									>
										<CircleX size={16} strokeWidth={2} aria-hidden="true" />
									</button>
								)}
							</motion.div>
							<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
								<Link href="/dashboard/searchspaces">
									<Button className="h-10">
										<Plus className="mr-2 h-4 w-4" />
										{"Create search space"}
									</Button>
								</Link>
							</motion.div>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{ownedSpaces.map((space) => renderSpaceCard(space, false))}

						{ownedSpaces.length === 0 && sharedSpaces.length === 0 && !fetching && (
							<motion.div
								variants={itemVariants}
								className="col-span-full flex flex-col items-center justify-center p-12 text-center"
							>
								<div className="rounded-full bg-muted/50 p-4 mb-4">
									<Search className="h-8 w-8 text-muted-foreground" />
								</div>
								<h3 className="text-lg font-medium mb-2">
									{search ? "No matching spaces" : "No spaces found"}
								</h3>
								<p className="text-muted-foreground mb-6">
									{search ? "Try a different search term" : "Create first space"}
								</p>
								{!search && (
									<Link href="/dashboard/searchspaces">
										<Button>
											<Plus className="mr-2 h-4 w-4" />
											{"Create search space"}
										</Button>
									</Link>
								)}
							</motion.div>
						)}

						{ownedSpaces.length > 0 && (
							<motion.div variants={itemVariants} className="aspect-[4/3]">
								<Tilt
									rotationFactor={6}
									isRevese
									springOptions={{
										stiffness: 26.7,
										damping: 4.1,
										mass: 0.2,
									}}
									className="group relative rounded-lg h-full"
								>
									<Link href="/dashboard/searchspaces" className="flex h-full">
										<div className="flex flex-col items-center justify-center h-full w-full rounded-xl border border-dashed bg-muted/10 hover:border-primary/50 transition-colors">
											<Plus className="h-10 w-10 mb-3 text-muted-foreground" />
											<span className="text-sm font-medium">
												{"Add new search space"}
											</span>
										</div>
									</Link>
								</Tilt>
							</motion.div>
						)}
					</div>

					{sharedSpaces.length > 0 && (
						<>
							<div className="flex justify-between items-center mt-8">
								<h2 className="text-2xl font-semibold">{"Shared with me"}</h2>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								{sharedSpaces.map((space) => renderSpaceCard(space, true))}
							</div>
						</>
					)}
				</div>
			</motion.div>
		</motion.div>
	);
};

export default DashboardPage;
