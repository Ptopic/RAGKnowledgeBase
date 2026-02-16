export function formatToolName(toolName: string): string {
	return toolName
		.split(/(?=[A-Z])|_/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ");
}
