// Helper function to get connector type display name
export const getConnectorTypeDisplay = (type: string): string => {
	const typeMap: Record<string, string> = {
		SLACK_CONNECTOR: "Slack",
		NOTION_CONNECTOR: "Notion",
		GITHUB_CONNECTOR: "GitHub",
		GOOGLE_CALENDAR_CONNECTOR: "Google Calendar",
		GOOGLE_GMAIL_CONNECTOR: "Google Gmail",
	};
	return typeMap[type] || type;
};
