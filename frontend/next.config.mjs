/** @type {import('next').NextConfig} */

const nextConfig = {
	output: "standalone",
	eslint: {
		ignoreDuringBuilds: true,
	},
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**",
			},
		],
	},
	headers: async () => [
		{
			source: "/:path*",
			headers: [
				{
					key: "Cache-Control",
					value: "public, max-age=0, must-revalidate",
				},
			],
		},
		{
			source: "/_next/static/:path*",
			headers: [
				{
					key: "Cache-Control",
					value: "public, max-age=31536000, immutable",
				},
			],
		},
	],
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

    return config;
  },
};

export default nextConfig;
