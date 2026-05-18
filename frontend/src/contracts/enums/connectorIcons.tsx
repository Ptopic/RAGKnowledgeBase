import {
	IconBrandGithub,
	IconBrandNotion,
	IconBrandSlack,
	IconBrandYoutube,
	IconCalendar,
	IconMail,
} from "@tabler/icons-react";
import {
	File,
	Globe,
	Microscope,
	Notebook,
	Search,
	Sparkles,
	Telescope,
} from "lucide-react";
import { EnumConnectorName } from "./connector";

export const getConnectorIcon = (
	connectorType: EnumConnectorName | string,
	className?: string,
) => {
	const iconProps = { className: className || "h-4 w-4" };

	switch (connectorType) {
		case EnumConnectorName.GITHUB_CONNECTOR:
			return <IconBrandGithub {...iconProps} />;
		case EnumConnectorName.SLACK_CONNECTOR:
			return <IconBrandSlack {...iconProps} />;
		case EnumConnectorName.NOTION_CONNECTOR:
			return <IconBrandNotion {...iconProps} />;
		case EnumConnectorName.GOOGLE_CALENDAR_CONNECTOR:
			return <IconCalendar {...iconProps} />;
		case EnumConnectorName.GOOGLE_GMAIL_CONNECTOR:
			return <IconMail {...iconProps} />;
		// Additional cases for non-enum connector types
		case "YOUTUBE_VIDEO":
			return <IconBrandYoutube {...iconProps} />;
		case "CRAWLED_URL":
			return <Globe {...iconProps} />;
		case "FILE":
			return <File {...iconProps} />;
		case "NOTEBOOK":
			return <Notebook {...iconProps} />;
		case "DEEP":
			return <Sparkles {...iconProps} />;
		case "DEEPER":
			return <Microscope {...iconProps} />;
		case "DEEPEST":
			return <Telescope {...iconProps} />;
		default:
			return <Search {...iconProps} />;
	}
};
