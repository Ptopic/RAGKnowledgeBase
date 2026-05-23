"use client";

import { ArrowLeft, Bot, Brain, Edit3, Key, Settings, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { ApiKeysManager } from "@/components/settings/api-keys-manager";
import { LLMRoleManager } from "@/components/settings/llm-role-manager";
import { MembersManager } from "@/components/settings/members-manager";
import { ModelConfigManager } from "@/components/settings/model-config-manager";
import { QueryTemplateManager } from "@/components/settings/query-template-manager";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
	const router = useRouter();
	const params = useParams();
	const searchSpaceId = Number(params.search_space_id);

	return (
		<div className="min-h-screen bg-background">
			<div className="container max-w-7xl mx-auto p-6 lg:p-8">
				<div className="space-y-8">
					{/* Header Section */}
					<div className="space-y-4">
						<div className="flex items-center space-x-4">
							{/* Back Button */}
							<button
								onClick={() => router.push(`/dashboard/${searchSpaceId}`)}
								className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
								aria-label="Back to Dashboard"
								type="button"
							>
								<ArrowLeft className="h-5 w-5 text-primary" />
							</button>
							<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
								<Settings className="h-6 w-6 text-primary" />
							</div>
							<div className="space-y-1">
								<h1 className="text-3xl font-bold tracking-tight">Settings</h1>
								<p className="text-lg text-muted-foreground">
									Manage your LLM configurations, role assignments, and query templates for this search space.
								</p>
							</div>
						</div>
						<Separator className="my-6" />
					</div>

					{/* Settings Content */}
					<Tabs defaultValue="models" className="space-y-8">
						<TabsList className="inline-flex h-auto flex-wrap gap-1">
							<TabsTrigger value="models" className="flex items-center gap-2 text-sm">
								<Bot className="h-4 w-4" />
								<span className="hidden sm:inline">Model Configs</span>
								<span className="sm:hidden">Models</span>
							</TabsTrigger>
							<TabsTrigger value="roles" className="flex items-center gap-2 text-sm">
								<Brain className="h-4 w-4" />
								<span className="hidden sm:inline">LLM Roles</span>
								<span className="sm:hidden">Roles</span>
							</TabsTrigger>
							<TabsTrigger value="api-keys" className="flex items-center gap-2 text-sm">
								<Key className="h-4 w-4" />
								<span className="hidden sm:inline">API Keys</span>
								<span className="sm:hidden">Keys</span>
							</TabsTrigger>
							<TabsTrigger value="templates" className="flex items-center gap-2 text-sm">
								<Edit3 className="h-4 w-4" />
								<span className="hidden sm:inline">Query Templates</span>
								<span className="sm:hidden">Templates</span>
							</TabsTrigger>
							<TabsTrigger value="members" className="flex items-center gap-2 text-sm">
								<Users className="h-4 w-4" />
								<span className="hidden sm:inline">Members</span>
								<span className="sm:hidden">Members</span>
							</TabsTrigger>
						</TabsList>

						<TabsContent value="models" className="space-y-6">
							<ModelConfigManager searchSpaceId={searchSpaceId} />
						</TabsContent>

						<TabsContent value="roles" className="space-y-6">
							<LLMRoleManager searchSpaceId={searchSpaceId} />
						</TabsContent>

						<TabsContent value="api-keys" className="space-y-6">
							<ApiKeysManager />
						</TabsContent>

						<TabsContent value="templates" className="space-y-6">
							<QueryTemplateManager searchSpaceId={searchSpaceId} />
						</TabsContent>

						<TabsContent value="members" className="space-y-6">
							<MembersManager searchSpaceId={searchSpaceId} />
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	);
}
