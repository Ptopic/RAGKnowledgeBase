/** @type {import('next').NextConfig} */

/**
 * Cache-Disabling Strategy for ChunkLoadError Prevention
 *
 * ChunkLoadError occurs when a deployed build serves stale HTML that references
 * JS chunk hashes that no longer exist on the server. The fix:
 *
 * 1. generateBuildId → unique build ID per deploy, so CDN/proxy treat each build as new
 * 2. generateEtags: false → no conditional requests that could serve stale content
 * 3. Cache-Control: no-store on ALL pages → browser/CDN/edge never cache HTML
 * 4. Cache-Control: immutable on /_next/static/* → once the correct HTML loads,
 *    its referenced chunks are cached permanently (hash-based filenames guarantee
 *    correctness). Removing this would cause re-downloads on every navigation
 *    without preventing ChunkLoadError (the issue is stale HTML, not stale chunks).
 * 5. poweredByHeader: false → removes X-Powered-By for security/clean headers
 */
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
	// Unique build ID per deploy — prevents CDN/proxy from serving builds across deployments
	generateBuildId: async () => {
		return Date.now().toString(36);
	},
	// Disable ETags — prevents conditional GETs that could serve stale content
	generateEtags: false,
	// Remove X-Powered-By header
	poweredByHeader: false,
	// Comprehensive cache-control headers for all routes
	headers: async () => [
		{
			source: "/:path*",
			headers: [
				{
					key: "Cache-Control",
					value: "no-store, no-cache, must-revalidate, proxy-revalidate",
				},
				{
					key: "Pragma",
					value: "no-cache",
				},
				{
					key: "Expires",
					value: "0",
				},
			],
		},
		{
			// Static chunks use content-hash filenames — safe to cache immutably.
			// This PREVENTS ChunkLoadError: fresh HTML → correct chunk hashes →
			// immutable cached chunks match. Removing this causes unnecessary
			// re-downloads without solving the stale-HTML root cause.
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
