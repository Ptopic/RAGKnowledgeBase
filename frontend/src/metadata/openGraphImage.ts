import { siteConfig } from '@shared/config/siteConfig';

export const openGraphImage = {
  images: [
    {
      url: siteConfig.ogImage!,
      width: 1200,
      height: 630,
      alt: siteConfig.websiteTitle,
    },
  ],
};
