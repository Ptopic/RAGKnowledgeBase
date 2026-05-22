/** @type {import('next').NextConfig} */

const nextConfig = {
	output: "standalone",
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

    return config;
  },
};

export default nextConfig;
