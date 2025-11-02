import { Metadata } from 'next';

import config from '@shared/config';
import { siteConfig } from '@shared/config/siteConfig';

import { openGraphImage } from './openGraphImage';

const metadata: Metadata = {
  metadataBase: new URL(config.websiteUrl),
  title: siteConfig.websiteTitle,
  description: siteConfig.websiteDescription,
  icons: [
    {
      url: 'https://nextjs.org/favicon.ico',
    },
  ],
  openGraph: {
    siteName: siteConfig.websiteTitle,
    title: siteConfig.websiteTitle,
    type: 'website',
    url: config.websiteUrl,
    ...openGraphImage,
  },
};

export default metadata;
