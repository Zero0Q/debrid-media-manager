/** @type {import('next').NextConfig} */

const nextConfig = {
	output: 'standalone',
	// Enable build cache
	experimental: {
		turbotrace: {
			logLevel: 'error'
		},
	},
	// Configure build cache options
	onDemandEntries: {
		// period (in ms) where the server will keep pages in the buffer
		maxInactiveAge: 25 * 1000,
		// number of pages that should be kept simultaneously without being disposed
		pagesBufferLength: 2,
	},
	images: {
		unoptimized: true,
		minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
		remotePatterns: [
			{
			  protocol: 'https',
			  hostname: 'image.tmdb.org',
			  port: '',
			  pathname: '/**',
			},
			{
			  protocol: 'https',
			  hostname: 'picsum.photos',
			  port: '',
			  pathname: '/**',
			},
			{
			  protocol: 'https',
			  hostname: 'm.media-amazon.com',
			  port: '',
			  pathname: '/**',
			},
			{
			  protocol: 'https',
			  hostname: 'static.debridmediamanager.com',
			  port: '',
			  pathname: '/**',
			},
			{
			  protocol: 'https',
			  hostname: 'images.metahub.space',
			  port: '',
			  pathname: '/**',
			},
			{
			  protocol: 'https',
			  hostname: 'fakeimg.pl',
			  port: '',
			  pathname: '/**',
			},
			{
			  protocol: 'https',
			  hostname: 'media.kitsu.app',
			  port: '',
			  pathname: '/**',
			},
			{
			  protocol: 'https',
			  hostname: 'cdn.myanimelist.net',
			  port: '',
			  pathname: '/**',
			},
			{
			  protocol: 'https',
			  hostname: 'cdn-eu.anidb.net',
			  port: '',
			  pathname: '/**',
			},
			{
			  protocol: 'https',
			  hostname: 'posters.debridmediamanager.com',
			  port: '',
			  pathname: '/**',
			},
		  ],
	  },
	reactStrictMode: false,
	publicRuntimeConfig: {
		// Will be available on both server and client
		externalSearchApiHostname: process.env.EXTERNAL_SEARCH_API_HOSTNAME,
		// Use local proxy instead of the external proxies
		proxy: process.env.NODE_ENV === 'production' ? '/api/localproxy?url=' : 'https://proxy#num#.debridmediamanager.com/anticors?url=',
		realDebridHostname: 'https://api.real-debrid.com',
		realDebridClientId: 'X245A4XAIBGVM',
		allDebridHostname: 'https://api.alldebrid.com',
		allDebridAgent: 'debridMediaManager',
		traktClientId: process.env.TRAKT_CLIENT_ID || '8a7455d06804b07fa25e27454706c6f2107b6fe5ed2ad805eff3b456a17e79f0',
		torboxHostname: 'https://api.torbox.app',
		patreonClientId: process.env.PATREON_CLIENT_ID,
		githubClientId: process.env.GITHUB_CLIENT_ID,
		discordClientId: process.env.DISCORD_CLIENT_ID,
	},
	webpack: (config) => {
		config.cache = false;
		return config;
	},
};

module.exports = nextConfig;
