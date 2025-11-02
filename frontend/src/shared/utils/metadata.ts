import { siteConfig } from '@shared/config/siteConfig';

export const getMetadataTitle = (title: string) =>
	`${title} | ${siteConfig.websiteTitle}`;
