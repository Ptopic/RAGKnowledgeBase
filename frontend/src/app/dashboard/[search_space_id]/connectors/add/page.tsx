"use client";

import {
	IconChevronDown,
	IconChevronRight,
} from "@tabler/icons-react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { EnumConnectorName } from "@/contracts/enums/connector";
import { getConnectorIcon } from "@/contracts/enums/connectorIcons";
import useGetSearchSpace from "@/api/searchspaces/hooks/useGetSearchSpace";
import { AccessDeniedPage } from "@/components/access-denied-page";
import { RouteCreditGate } from "@/components/route-credit-gate";

// Define the Connector type
interface Connector {
	id: string;
	title: string;
	description: string;
	icon: React.ReactNode;
	status: "available" | "coming-soon" | "connected";
}

interface ConnectorCategory {
	id: string;
	title: string;
	connectors: Connector[];
}

// Define connector categories and their connectors
const connectorCategories: ConnectorCategory[] = [
	{
		id: "team-chats",
		title: "team_chats",
		connectors: [
			{
				id: "slack-connector",
				title: "Slack",
				description: "slack_desc",
				icon: getConnectorIcon(EnumConnectorName.SLACK_CONNECTOR, "h-6 w-6"),
				status: "available",
			},
		],
	},
	{
		id: "knowledge-bases",
		title: "knowledge_bases",
		connectors: [
			{
				id: "notion-connector",
				title: "Notion",
				description: "notion_desc",
				icon: getConnectorIcon(EnumConnectorName.NOTION_CONNECTOR, "h-6 w-6"),
				status: "available",
			},
			{
				id: "github-connector",
				title: "GitHub",
				description: "github_desc",
				icon: getConnectorIcon(EnumConnectorName.GITHUB_CONNECTOR, "h-6 w-6"),
				status: "available",
			},
		],
	},
	{
		id: "communication",
		title: "communication",
		connectors: [
			{
				id: "google-calendar-connector",
				title: "Google Calendar",
				description: "calendar_desc",
				icon: getConnectorIcon(
					EnumConnectorName.GOOGLE_CALENDAR_CONNECTOR,
					"h-6 w-6",
				),
				status: "available",
			},
			{
				id: "google-gmail-connector",
				title: "Gmail",
				description: "gmail_desc",
				icon: getConnectorIcon(
					EnumConnectorName.GOOGLE_GMAIL_CONNECTOR,
					"h-6 w-6",
				),
				status: "available",
			},
		],
	},
];

// Animation variants
const fadeIn = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: { duration: 0.4 } },
};

const staggerContainer = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.1,
		},
	},
};

const cardVariants: Variants = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			type: "spring",
			stiffness: 260,
			damping: 20,
		},
	},
	hover: {
		scale: 1.02,
		boxShadow:
			"0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
		transition: {
			type: "spring",
			stiffness: 400,
			damping: 10,
		},
	},
};

export default function ConnectorsPage() {
	const params = useParams();
	const searchSpaceId = params.search_space_id as string;
	const searchSpaceIdNum = Number(searchSpaceId);
	const { data: searchSpace } = useGetSearchSpace(searchSpaceIdNum);
	const [expandedCategories, setExpandedCategories] = useState<string[]>([
		"knowledge-bases",
		"team-chats",
		"communication",
	]);

	if (searchSpace && searchSpace.role === "VIEWER" && !searchSpace.is_owner) {
		return <AccessDeniedPage />;
	}

	const toggleCategory = (categoryId: string) => {
		setExpandedCategories((prev) =>
			prev.includes(categoryId)
				? prev.filter((id) => id !== categoryId)
				: [...prev, categoryId],
		);
	};

	return (
		<RouteCreditGate>
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className="w-full px-6 py-4"
		>
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						Add Connector
					</h1>
					<p className="text-muted-foreground mt-2">
						Connect your favorite tools and services to your knowledge base
					</p>
				</div>
			</div>

			<div className="mt-6 space-y-6">
				<motion.div
					className="space-y-8"
					initial="hidden"
					animate="visible"
					variants={staggerContainer}
				>
				{connectorCategories.map((category) => (
					<motion.div
						key={category.id}
						variants={fadeIn}
						className="rounded-lg border bg-card text-card-foreground shadow-sm"
					>
						<Collapsible
							open={expandedCategories.includes(category.id)}
							onOpenChange={() => toggleCategory(category.id)}
							className="w-full"
						>
							<div className="flex items-center justify-between space-x-4 p-4">
								<h3 className="text-xl font-semibold">
									{category.title
										.replace(/_/g, " ")
										.replace(/\b\w/g, (l) => l.toUpperCase())}
								</h3>
								<CollapsibleTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										className="w-9 p-0 hover:bg-muted"
									>
										<motion.div
											animate={{
												rotate: expandedCategories.includes(category.id)
													? 180
													: 0,
											}}
											transition={{ duration: 0.3, ease: "easeInOut" }}
										>
											<IconChevronDown className="h-5 w-5" />
										</motion.div>
										<span className="sr-only">Toggle</span>
									</Button>
								</CollapsibleTrigger>
							</div>

							<CollapsibleContent>
								<AnimatePresence>
									<motion.div
										className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 p-4"
										variants={staggerContainer}
										initial="hidden"
										animate="visible"
										exit="hidden"
									>
										{category.connectors.map((connector) => (
											<motion.div
												key={connector.id}
												variants={cardVariants}
												whileHover="hover"
												className="col-span-1"
											>
												<Card className="h-full flex flex-col overflow-hidden border-transparent transition-all duration-200 hover:border-primary/50">
													<CardHeader className="flex-row items-center gap-4 pb-2">
														<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
															<motion.div
																whileHover={{ rotate: 5, scale: 1.1 }}
																className="text-primary"
															>
																{connector.icon}
															</motion.div>
														</div>
														<div>
															<div className="flex items-center gap-2">
																<h3 className="font-medium">
																	{connector.title}
																</h3>
																{connector.status === "coming-soon" && (
																	<Badge
																		variant="outline"
																		className="text-xs bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
																	>
																		Coming Soon
																	</Badge>
																)}
																{connector.status === "connected" && (
																	<Badge
																		variant="outline"
																		className="text-xs bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800"
																	>
																		Connected
																	</Badge>
																)}
															</div>
														</div>
													</CardHeader>

													<CardContent className="pb-4">
														<p className="text-sm text-muted-foreground">
															{connector.description
																.replace(/_/g, " ")
																.replace(/\b\w/g, (l) => l.toUpperCase())}
														</p>
													</CardContent>

													<CardFooter className="mt-auto pt-2">
														{connector.status === "available" && (
															<Link
																href={`/dashboard/${searchSpaceId}/connectors/add/${connector.id}`}
																className="w-full"
															>
																<Button
																	variant="default"
																	className="w-full group"
																>
																	<span>Connect</span>
																	<motion.div
																		className="ml-1"
																		initial={{ x: 0 }}
																		whileHover={{ x: 3 }}
																		transition={{
																			type: "spring",
																			stiffness: 400,
																			damping: 10,
																		}}
																	>
																		<IconChevronRight className="h-4 w-4" />
																	</motion.div>
																</Button>
															</Link>
														)}
														{connector.status === "coming-soon" && (
															<Button
																variant="outline"
																disabled
																className="w-full opacity-70"
															>
																Coming Soon
															</Button>
														)}
														{connector.status === "connected" && (
															<Button
																variant="outline"
																className="w-full border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
															>
																Manage
															</Button>
														)}
													</CardFooter>
												</Card>
											</motion.div>
										))}
									</motion.div>
								</AnimatePresence>
							</CollapsibleContent>
						</Collapsible>
					</motion.div>
				))}
			</motion.div>
			</div>
		</motion.div>
		</RouteCreditGate>
	);
}
