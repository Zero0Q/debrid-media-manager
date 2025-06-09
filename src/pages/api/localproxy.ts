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

		// Debug log for troubleshooting
		console.log(
			`Proxy request to ${parsedUrl.hostname}, headers:`,
			JSON.stringify(req.headers)
		);

		// Check if host is allowed
		if (!ALLOWED_HOSTS.some((host) => parsedUrl.hostname.includes(host))) {
			return res.status(403).json({ error: `Host ${parsedUrl.hostname} is not allowed` });
		}

		// Add any query parameters
		appendQueryParams(parsedUrl, otherQueryParams);

		// Build request headers
		let reqHeaders: Record<string, string> = {};

		// Handle Authorization header first and most importantly
		const authHeader = req.headers.authorization || req.headers.Authorization;
		if (authHeader) {
			const authValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
			reqHeaders['Authorization'] = authValue;
			console.log(`Authorization header found: ${authValue.substring(0, 20)}...`);
		} else {
			console.log('No Authorization header found in request');
		}

		// Add API specific headers, but don't override Authorization
		for (const [apiHost, headers] of Object.entries(API_HEADERS)) {
			if (parsedUrl.hostname.includes(apiHost)) {
				Object.entries(headers).forEach(([key, value]) => {
					// Don't override Authorization if it already exists
					if (key.toLowerCase() !== 'authorization' || !reqHeaders['Authorization']) {
						reqHeaders[key] = value;
					}
				});
				break;
			}
		}

		// Handle Content-Type header specifically - preserve client's Content-Type
		const contentTypeHeader = req.headers['content-type'] || req.headers['Content-Type'];
		if (contentTypeHeader) {
			const ctValue = Array.isArray(contentTypeHeader)
				? contentTypeHeader[0]
				: contentTypeHeader;
			reqHeaders['Content-Type'] = ctValue;
		}

		// Forward other important headers, but avoid duplicates
		Object.entries(req.headers).forEach(([key, value]) => {
			const lowerKey = key.toLowerCase();
			// Skip if we've already handled these headers
			if (lowerKey === 'authorization' || lowerKey === 'content-type') {
				return;
			}

			// Handle trakt-specific headers from the client (they should override API defaults)
			if (lowerKey.startsWith('trakt-')) {
				if (typeof value === 'string') {
					reqHeaders[key] = value;
				} else if (Array.isArray(value) && value.length > 0) {
					reqHeaders[key] = value[0];
				}
				return;
			}

			// Handle other custom headers
			if (lowerKey.startsWith('x-') || lowerKey === 'user-agent' || lowerKey === 'accept') {
				if (typeof value === 'string') {
					reqHeaders[key] = value;
				} else if (Array.isArray(value) && value.length > 0) {
					reqHeaders[key] = value[0];
				}
			}
		});

		// Debug log to see what headers are being sent
		console.log(
			`Sending headers to ${parsedUrl.hostname}:`,
			JSON.stringify(reqHeaders, null, 2)
		);

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

		// Debug log for response
		console.log(`Received response from ${parsedUrl.hostname}, status:`, response.status);

		if (contentType.includes('application/json')) {
			try {
				const jsonData = await response.json();
				responseBody = JSON.stringify(jsonData);
			} catch (error) {
				// If JSON parsing fails, fall back to text
				responseBody = await response.text();
			}
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
				key === 'content-disposition' ||
				key === 'content-type'
			) {
				responseHeaders[key] = value;
			}
		});

		// Set status and content type
		res.status(response.status);
		if (contentType) {
			res.setHeader('content-type', contentType);
		}

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
