import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import useFetchRepositories from "@/api/github/hooks/useFetchRepositories";
import {
	type EditConnectorFormValues,
	type EditMode,
	editConnectorSchema,
	type GithubPatFormValues,
	type GithubRepo,
	githubPatSchema,
} from "@/components/editConnector/types";
import {
	type SearchSourceConnector,
	useSearchSourceConnectors,
} from "@/hooks/use-search-source-connectors";

const normalizeListInput = (value: unknown): string[] => {
	if (Array.isArray(value)) {
		return value
			.map((item) => String(item).trim())
			.filter((item) => item.length > 0);
	}
	if (typeof value === "string") {
		return value
			.split(",")
			.map((item) => item.trim())
			.filter((item) => item.length > 0);
	}
	return [];
};

const arraysEqual = (a: string[], b: string[]): boolean => {
	if (a.length !== b.length) return false;
	return a.every((value, index) => value === b[index]);
};

const normalizeBoolean = (value: unknown): boolean | null => {
	if (typeof value === "boolean") return value;
	if (typeof value === "string") {
		const lowered = value.trim().toLowerCase();
		if (["true", "1", "yes", "on"].includes(lowered)) return true;
		if (["false", "0", "no", "off"].includes(lowered)) return false;
	}
	if (typeof value === "number") {
		if (value === 1) return true;
		if (value === 0) return false;
	}
	return null;
};

export function useConnectorEditPage(
	connectorId: number,
	searchSpaceId: string,
) {
	const router = useRouter();
	const {
		connectors,
		updateConnector,
		isLoading: connectorsLoading,
	} = useSearchSourceConnectors(false, parseInt(searchSpaceId));

	// State managed by the hook
	const [connector, setConnector] = useState<SearchSourceConnector | null>(
		null,
	);
	const [originalConfig, setOriginalConfig] = useState<Record<
		string,
		any
	> | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [currentSelectedRepos, setCurrentSelectedRepos] = useState<string[]>(
		[],
	);
	const [originalPat, setOriginalPat] = useState<string>("");
	const [editMode, setEditMode] = useState<EditMode>("viewing");
	const [fetchedRepos, setFetchedRepos] = useState<GithubRepo[] | null>(null);
	const [newSelectedRepos, setNewSelectedRepos] = useState<string[]>([]);

	const { mutate: fetchRepositories, isPending: isFetchingRepos } =
		useFetchRepositories({
			onSuccess: (data) => {
				setFetchedRepos(data);
				setNewSelectedRepos([...currentSelectedRepos]);
			},
		});

	// Forms managed by the hook
	const patForm = useForm<GithubPatFormValues>({
		resolver: zodResolver(githubPatSchema),
		defaultValues: { github_pat: "" },
	});
	const editForm = useForm<EditConnectorFormValues>({
		resolver: zodResolver(editConnectorSchema),
		defaultValues: {
			name: "",
			SLACK_BOT_TOKEN: "",
			NOTION_INTEGRATION_TOKEN: "",
			GOOGLE_CALENDAR_CLIENT_ID: "",
			GOOGLE_CALENDAR_CLIENT_SECRET: "",
			GOOGLE_CALENDAR_REFRESH_TOKEN: "",
			GOOGLE_CALENDAR_CALENDAR_IDS: "",
		},
	});

	// Effect to load initial data
	useEffect(() => {
		if (!connectorsLoading && connectors.length > 0 && !connector) {
			const currentConnector = connectors.find((c) => c.id === connectorId);
			if (currentConnector) {
				setConnector(currentConnector);
				const config = currentConnector.config || {};
				setOriginalConfig(config);
				editForm.reset({
					name: currentConnector.name,
					SLACK_BOT_TOKEN: config.SLACK_BOT_TOKEN || "",
					NOTION_INTEGRATION_TOKEN: config.NOTION_INTEGRATION_TOKEN || "",
					GOOGLE_CALENDAR_CLIENT_ID: config.GOOGLE_CALENDAR_CLIENT_ID || "",
					GOOGLE_CALENDAR_CLIENT_SECRET: config.GOOGLE_CALENDAR_CLIENT_SECRET || "",
					GOOGLE_CALENDAR_REFRESH_TOKEN: config.GOOGLE_CALENDAR_REFRESH_TOKEN || "",
					GOOGLE_CALENDAR_CALENDAR_IDS: Array.isArray(config.GOOGLE_CALENDAR_CALENDAR_IDS)
						? config.GOOGLE_CALENDAR_CALENDAR_IDS.join(", ")
						: config.GOOGLE_CALENDAR_CALENDAR_IDS || "",
				});
				if (currentConnector.connector_type === "GITHUB_CONNECTOR") {
					const savedRepos = config.repo_full_names || [];
					const savedPat = config.GITHUB_PAT || "";
					setCurrentSelectedRepos(savedRepos);
					setNewSelectedRepos(savedRepos);
					setOriginalPat(savedPat);
					patForm.reset({ github_pat: savedPat });
					setEditMode("viewing");
				}
			} else {
				toast.error("Connector not found.");
				router.push(`/dashboard/${searchSpaceId}/connectors`);
			}
		}
	}, [
		connectorId,
		connectors,
		connectorsLoading,
		router,
		searchSpaceId,
		connector,
		editForm,
		patForm,
	]);

	// Handlers managed by the hook
	const handleFetchRepositories = useCallback(
		(values: GithubPatFormValues) => {
			setFetchedRepos(null);
			fetchRepositories({ github_pat: values.github_pat });
		},
		[fetchRepositories],
	);

	const handleRepoSelectionChange = useCallback(
		(repoFullName: string, checked: boolean) => {
			setNewSelectedRepos((prev) =>
				checked
					? [...prev, repoFullName]
					: prev.filter((name) => name !== repoFullName),
			);
		},
		[],
	);

	const handleSaveChanges = useCallback(
		async (formData: EditConnectorFormValues) => {
			if (!connector || !originalConfig) return;
			setIsSaving(true);
			const updatePayload: Partial<SearchSourceConnector> = {};
			let configChanged = false;
			let newConfig: Record<string, any> | null = null;

			if (formData.name !== connector.name) {
				updatePayload.name = formData.name;
			}

			switch (connector.connector_type) {
				case "GITHUB_CONNECTOR": {
					const currentPatInForm = patForm.getValues("github_pat");
					const patChanged = currentPatInForm !== originalPat;
					const initialRepoSet = new Set(currentSelectedRepos);
					const newRepoSet = new Set(newSelectedRepos);
					const reposChanged =
						initialRepoSet.size !== newRepoSet.size ||
						!Array.from(initialRepoSet).every((repo) => newRepoSet.has(repo));
					if (
						patChanged ||
						(editMode === "editing_repos" &&
							reposChanged &&
							fetchedRepos !== null)
					) {
						if (
							!currentPatInForm ||
							!(
								currentPatInForm.startsWith("ghp_") ||
								currentPatInForm.startsWith("github_pat_")
							)
						) {
							toast.error("Invalid GitHub PAT format. Cannot save.");
							setIsSaving(false);
							return;
						}
						newConfig = {
							GITHUB_PAT: currentPatInForm,
							repo_full_names: newSelectedRepos,
						};
						if (reposChanged && newSelectedRepos.length === 0) {
							toast.warning("Warning: No repositories selected.");
						}
					}
					break;
				}
				case "SLACK_CONNECTOR":
					if (formData.SLACK_BOT_TOKEN !== originalConfig.SLACK_BOT_TOKEN) {
						if (!formData.SLACK_BOT_TOKEN) {
							toast.error("Slack Token empty.");
							setIsSaving(false);
							return;
						}
						newConfig = { SLACK_BOT_TOKEN: formData.SLACK_BOT_TOKEN };
					}
					break;
				case "NOTION_CONNECTOR":
					if (
						formData.NOTION_INTEGRATION_TOKEN !==
						originalConfig.NOTION_INTEGRATION_TOKEN
					) {
						if (!formData.NOTION_INTEGRATION_TOKEN) {
							toast.error("Notion Token empty.");
							setIsSaving(false);
							return;
						}
						newConfig = {
							NOTION_INTEGRATION_TOKEN: formData.NOTION_INTEGRATION_TOKEN,
						};
					}
					break;
			}

			if (newConfig !== null) {
				updatePayload.config = newConfig;
				configChanged = true;
			}

			if (Object.keys(updatePayload).length === 0) {
				toast.info("No changes detected.");
				setIsSaving(false);
				if (connector.connector_type === "GITHUB_CONNECTOR") {
					setEditMode("viewing");
					patForm.reset({ github_pat: originalPat });
				}
				return;
			}

			try {
				await updateConnector(connectorId, updatePayload);
				toast.success("Connector updated!");
				const newlySavedConfig = updatePayload.config || originalConfig;
				setOriginalConfig(newlySavedConfig);
				if (updatePayload.name) {
					setConnector((prev) =>
						prev
							? { ...prev, name: updatePayload.name!, config: newlySavedConfig }
							: null,
					);
				}
				if (configChanged) {
					if (connector.connector_type === "GITHUB_CONNECTOR") {
						const savedGitHubConfig = newlySavedConfig as {
							GITHUB_PAT?: string;
							repo_full_names?: string[];
						};
						setCurrentSelectedRepos(savedGitHubConfig.repo_full_names || []);
						setOriginalPat(savedGitHubConfig.GITHUB_PAT || "");
						setNewSelectedRepos(savedGitHubConfig.repo_full_names || []);
						patForm.reset({ github_pat: savedGitHubConfig.GITHUB_PAT || "" });
					} else if (connector.connector_type === "SLACK_CONNECTOR") {
						editForm.setValue(
							"SLACK_BOT_TOKEN",
							newlySavedConfig.SLACK_BOT_TOKEN || "",
						);
					} else if (connector.connector_type === "NOTION_CONNECTOR") {
						editForm.setValue(
							"NOTION_INTEGRATION_TOKEN",
							newlySavedConfig.NOTION_INTEGRATION_TOKEN || "",
						);
					} else if (connector.connector_type === "GOOGLE_CALENDAR_CONNECTOR") {
						editForm.setValue(
							"GOOGLE_CALENDAR_CLIENT_ID",
							newlySavedConfig.GOOGLE_CALENDAR_CLIENT_ID || "",
						);
						editForm.setValue(
							"GOOGLE_CALENDAR_CLIENT_SECRET",
							newlySavedConfig.GOOGLE_CALENDAR_CLIENT_SECRET || "",
						);
						editForm.setValue(
							"GOOGLE_CALENDAR_REFRESH_TOKEN",
							newlySavedConfig.GOOGLE_CALENDAR_REFRESH_TOKEN || "",
						);
						editForm.setValue(
							"GOOGLE_CALENDAR_CALENDAR_IDS",
							Array.isArray(newlySavedConfig.GOOGLE_CALENDAR_CALENDAR_IDS)
								? newlySavedConfig.GOOGLE_CALENDAR_CALENDAR_IDS.join(", ")
								: newlySavedConfig.GOOGLE_CALENDAR_CALENDAR_IDS || "",
						);
					}
				}
				if (connector.connector_type === "GITHUB_CONNECTOR") {
					setEditMode("viewing");
					setFetchedRepos(null);
				}
				// Resetting simple form values is handled by useEffect if connector state updates
			} catch (error) {
				console.error("Error updating connector:", error);
				toast.error(
					error instanceof Error
						? error.message
						: "Failed to update connector.",
				);
			} finally {
				setIsSaving(false);
			}
		},
		[
			connector,
			originalConfig,
			updateConnector,
			connectorId,
			patForm,
			originalPat,
			currentSelectedRepos,
			newSelectedRepos,
			editMode,
			fetchedRepos,
			editForm,
		],
	); // Added editForm to dependencies

	// Return values needed by the component
	return {
		connectorsLoading,
		connector,
		isSaving,
		editForm,
		patForm,
		handleSaveChanges,
		// GitHub specific props
		editMode,
		setEditMode,
		originalPat,
		currentSelectedRepos,
		fetchedRepos,
		setFetchedRepos,
		newSelectedRepos,
		setNewSelectedRepos,
		isFetchingRepos,
		handleFetchRepositories,
		handleRepoSelectionChange,
	};
}
