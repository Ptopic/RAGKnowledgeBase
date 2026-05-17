import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */

import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**",
			},
		],
	},
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /^electron$/ }),
    );

    const arr = config.module.rules.filter(
      (r) => !!r.test && '.svg'.match(r.test),
    );
    const svgRule = { ...arr[0] };

    config.module.rules.push({
      test: /\.mdx$/,
      type: 'asset/source',
    });

    config.module.rules.push({
      test: /\.svg$/,
      issuer: /\.(js|ts)x?$/,
      use: ['@svgr/webpack'],
      exclude: /\.background\.svg$/,
    });

    config.module.rules.push({
      ...svgRule,
      test: /\.background\.svg$/,
    });

    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    // Force a single Yjs instance to prevent "Yjs was already imported" warning
    // which breaks constructor/instanceof checks across copies
    // See: https://github.com/yjs/yjs/issues/438
    config.resolve.alias.yjs = require.resolve('yjs');

    return config;
  },
};

const sentryWebpackPluginOptions = {
  silent: true,
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
