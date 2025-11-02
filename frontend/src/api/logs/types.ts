export type LogLevel = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";
export type LogStatus = "IN_PROGRESS" | "SUCCESS" | "FAILED";

export interface Log {
	id: number;
	level: LogLevel;
	status: LogStatus;
	message: string;
	source?: string;
	log_metadata?: Record<string, any>;
	created_at: string;
	search_space_id: number;
}

export interface GetLogsParams {
	search_space_id?: number;
	level?: LogLevel;
	status?: LogStatus;
	source?: string;
	start_date?: string;
	end_date?: string;
	skip?: number;
	limit?: number;
}

export interface CreateLogRequest {
	level: LogLevel;
	status: LogStatus;
	message: string;
	source?: string;
	log_metadata?: Record<string, any>;
	search_space_id: number;
}

export interface UpdateLogRequest {
	level?: LogLevel;
	status?: LogStatus;
	message?: string;
	source?: string;
	log_metadata?: Record<string, any>;
}

export interface LogSummary {
	total_logs: number;
	time_window_hours: number;
	by_status: Record<string, number>;
	by_level: Record<string, number>;
	by_source: Record<string, number>;
	active_tasks: Array<{
		id: number;
		task_name: string;
		message: string;
		started_at: string;
		source?: string;
	}>;
	recent_failures: Array<{
		id: number;
		task_name: string;
		message: string;
		failed_at: string;
		source?: string;
		error_details?: string;
	}>;
}

export interface GetLogsSummaryParams {
	search_space_id: number;
	hours?: number;
}
