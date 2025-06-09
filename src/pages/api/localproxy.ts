// filepath: /Users/zeroq/Documents/GitHub/debrid-media-manager/src/pages/api/localproxy.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { NextApiHandler } from 'next';

// Constants for readability and maintainability
const HTTP_METHODS = {
	POST: 'POST',
	PUT: 'PUT',
	PATCH: 'PATCH',
};

const CONTENT_TYPES = {
	JSON: 'application/json',
	FORM: 'application/x-www-form-urlencoded',
};

const ALLOWED_HOSTS = ['api.real-debrid.com', 'api.alldebrid.com'];

// Utility function to append query parameters
function appendQueryParams(url: URL, params: any) {
	Object.keys(params).forEach((key) => {
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
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
		if (!ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
			return res.status(403).json({ error: 'Host is not allowed' });
		}

		appendQueryParams(parsedUrl, otherQueryParams);

		// Simplified header setting
		const reqHeaders = {
			...(req.headers.authorization && { authorization: req.headers.authorization }),
			...(req.headers['content-type'] && { 'content-type': req.headers['content-type'] }),
		};

		let reqBody;
		if (
			[HTTP_METHODS.POST, HTTP_METHODS.PUT, HTTP_METHODS.PATCH].includes(req.method || '') &&
			req.headers['content-type']
		) {
			reqBody =
				req.headers['content-type'] === CONTENT_TYPES.JSON
					? JSON.stringify(req.body)
					: new URLSearchParams(req.body).toString();
		}

		const response = await fetch(parsedUrl.toString(), {
			headers: reqHeaders,
			method: req.method,
			body: reqBody,
		});

		const responseBody = await response.text();

		const responseHeaders: { [key: string]: string } = {};
		response.headers.forEach((value, key) => {
			if (key.startsWith('x-')) {
				responseHeaders[key] = value;
			}
		});

		res.status(response.status).setHeader(
			'content-type',
			response.headers.get('content-type') || ''
		);
		Object.keys(responseHeaders).forEach((key) => {
			res.setHeader(key, responseHeaders[key]);
		});

		res.send(responseBody);
	} catch (err: unknown) {
		console.error(err);
		res.status(500).json({ error: `Internal Server Error: ${err}` });
	}
};

export default handler;
