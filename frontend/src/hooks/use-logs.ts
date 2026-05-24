"use client";
import useCreateLog from "@api/logs/hooks/useCreateLog";
import useDeleteLog from "@api/logs/hooks/useDeleteLog";
import useGetLogs from "@api/logs/hooks/useGetLogs";
import useGetLogsSummary from "@api/logs/hooks/useGetLogsSummary";
import useUpdateLog from "@api/logs/hooks/useUpdateLog";
import type {
	CreateLogRequest,
	GetLogsParams,
	LogLevel,
	LogStatus,
	UpdateLogRequest,
} from "@api/logs/types";
import { useMemo } from "react";

// Re-export types for backward compatibility
export type { Log, LogLevel, LogStatus, LogSummary } from "@api/logs/types";

export interface LogFilters {
	level?: LogLevel;
	status?: LogStatus;
	source?: string;
	start_date?: string;
	end_date?: string;
	skip?: number;
	limit?: number;
}

export function useLogs(searchSpaceId?: number, filters: LogFilters = {}) {
	// Combine searchSpaceId with filters
	const params = useMemo<GetLogsParams | null>(() => {
		if (searchSpaceId === undefined && !Object.keys(filters).length) {
			return null;
		}
		return {
			search_space_id: searchSpaceId,
			...filters,
		};
	}, [searchSpaceId, filters]);

	// Use the React Query hooks
	const { data: logs = [], isLoading: loading, error, refetch } = useGetLogs(params);
	const createLogMutation = useCreateLog();
	const updateLogMutation = useUpdateLog();
	const deleteLogMutation = useDeleteLog();

	// Wrapper functions to maintain backward compatibility
	const refreshLogs = async () => {
		const { data } = await refetch();
		return data;
	};

	const createLog = async (logData: CreateLogRequest) => {
		return createLogMutation.mutateAsync(logData);
	};

	const updateLog = async (logId: number, updateData: UpdateLogRequest) => {
		if (!searchSpaceId) throw new Error("Search Space ID is required");
		return updateLogMutation.mutateAsync({ id: logId, searchSpaceId, data: updateData });
	};

	const deleteLog = async (logId: number) => {
		if (!searchSpaceId) throw new Error("Search Space ID is required");
		await deleteLogMutation.mutateAsync({ id: logId, searchSpaceId });
		return true;
	};

	const getLog = async (logId: number) => {
		if (!searchSpaceId) throw new Error("Search Space ID is required");
		const logsClientRequests = (await import("@api/logs/authClientRequests"))
			.default;
		return logsClientRequests.getLog(logId, searchSpaceId);
	};

	const fetchLogs = async () => {
		const { data } = await refetch();
		return data;
	};

	return {
		logs,
		loading,
		error: error ? error.message : null,
		refreshLogs,
		createLog,
		updateLog,
		deleteLog,
		getLog,
		fetchLogs,
	};
}

// Separate hook for log summary
export function useLogsSummary(searchSpaceId: number, hours: number = 24) {
	const params = useMemo(
		() => (searchSpaceId ? { search_space_id: searchSpaceId, hours } : null),
		[searchSpaceId, hours],
	);

	const {
		data: summary = null,
		isLoading: loading,
		error,
		refetch,
	} = useGetLogsSummary(params);

	const refreshSummary = async () => {
		const { data } = await refetch();
		return data;
	};

	return {
		summary,
		loading,
		error: error ? error.message : null,
		refreshSummary,
	};
}
