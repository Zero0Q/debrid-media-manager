// filepath: /Users/zeroq/Documents/GitHub/debrid-media-manager/src/pages/api/localproxy.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { NextApiHandler } from 'next';
import getConfig from 'next/config';

// Get configuration
const { publicRuntimeConfig: config } = getConfig();

// Constants for readability and maintainability
const HTTP_METHODS = {
	POST: 'POST',
	PUT: 'PUT',
	PATCH: 'PATCH',
	DELETE: 'DELETE',
};

const CONTENT_TYPES = {
	JSON: 'application/json',
	FORM: 'application/x-www-form-urlencoded',
};

// Extended list of allowed hosts for all services used by the application
const ALLOWED_HOSTS = [
	'api.real-debrid.com', // Real-Debrid API
	'api.alldebrid.com', // AllDebrid API
	'api.trakt.tv', // Trakt TV API
	'api.torbox.app', // TorBox API
	'api.themoviedb.org', // TMDB API
	'image.tmdb.org', // TMDB Images
	'static.debridmediamanager.com', // Static assets
	'posters.debridmediamanager.com', // Poster images
];

// API specific headers
const API_HEADERS = {
	'api.trakt.tv': {
		'trakt-api-version': '2',
		'trakt-api-key': config.traktClientId,
		'Content-Type': 'application/json',
	},
};

// Utility function to append query parameters
function appendQueryParams(url: URL, params: any) {
	Object.keys(params).forEach((key) => {
		if (key === 'url') return; // Skip the url parameter as it's used by the proxy itself
		const value = params[key];
		if (Array.isArray(value)) {
			value.forEach((v) => url.searchParams.append(key, v));
		} else {
			url.searchParams.append(key, value as string);
		}
	});
}

const handler: NextApiHandler = async (req: NextApiRequest, res: NextApiResponse) => {
	try {
		// Set CORS headers to allow requests from any origin when running on Heroku
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
		res.setHeader(
			'Access-Control-Allow-Headers',
			'Content-Type, Authorization, trakt-api-key, trakt-api-version'
		);

		// Handle preflight OPTIONS request
		if (req.method === 'OPTIONS') {
			res.status(200).end();
			return;
		}

		const { url, ...otherQueryParams } = req.query;
		if (typeof url !== 'string' || !url) {
			return res.status(400).json({ error: 'No URL provided' });
		}

		const decodedUrl = decodeURIComponent(url);
		const parsedUrl = new URL(decodedUrl);

		// Check if host is allowed
		if (!ALLOWED_HOSTS.some((host) => parsedUrl.hostname.includes(host))) {
			return res.status(403).json({ error: `Host ${parsedUrl.hostname} is not allowed` });
		}

		// Add any query parameters
		appendQueryParams(parsedUrl, otherQueryParams);

		// Build request headers
		let reqHeaders: Record<string, string> = {
			// Forward common headers
			...(req.headers.authorization && { authorization: req.headers.authorization }),
			...(req.headers['content-type'] && {
				'content-type': req.headers['content-type' as keyof typeof req.headers] as string,
			}),
		};

		// Add API specific headers
		for (const [apiHost, headers] of Object.entries(API_HEADERS)) {
			if (parsedUrl.hostname.includes(apiHost)) {
				reqHeaders = { ...reqHeaders, ...headers };
				break;
			}
		}

		// Forward all custom headers that were in the original request
		Object.entries(req.headers).forEach(([key, value]) => {
			if (key.startsWith('x-') || key.toLowerCase().startsWith('trakt-')) {
				reqHeaders[key] = value as string;
			}
		});

		// Handle request body for POST, PUT, PATCH, DELETE
		let reqBody: string | URLSearchParams | undefined;
		if (
			[HTTP_METHODS.POST, HTTP_METHODS.PUT, HTTP_METHODS.PATCH, HTTP_METHODS.DELETE].includes(
				req.method || ''
			) &&
			req.headers['content-type']
		) {
			if (req.headers['content-type'].includes('application/json')) {
				reqBody = JSON.stringify(req.body);
			} else if (req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
				reqBody = new URLSearchParams(req.body).toString();
			} else {
				reqBody = req.body;
			}
		}

		console.log(`Proxying request to: ${parsedUrl.toString()}`);

		const response = await fetch(parsedUrl.toString(), {
			headers: reqHeaders,
			method: req.method,
			body: reqBody,
		});

		// Get response body
		let responseBody: any;
		const contentType = response.headers.get('content-type') || '';
		if (contentType.includes('application/json')) {
			responseBody = await response.json();
			responseBody = JSON.stringify(responseBody);
		} else {
			responseBody = await response.text();
		}

		// Forward selected response headers
		const responseHeaders: { [key: string]: string } = {};
		response.headers.forEach((value, key) => {
			// Forward typical response headers we might need
			if (
				key.startsWith('x-') ||
				key === 'cache-control' ||
				key === 'etag' ||
				key === 'content-disposition'
			) {
				responseHeaders[key] = value;
			}
		});

		// Set status and content type
		res.status(response.status);
		res.setHeader('content-type', contentType);

		// Set other response headers
		Object.keys(responseHeaders).forEach((key) => {
			res.setHeader(key, responseHeaders[key]);
		});

		// Send response
		res.send(responseBody);
	} catch (err: unknown) {
		console.error('Proxy error:', err);
		res.status(500).json({ error: `Internal Server Error: ${err}` });
	}
};

export default handler;
