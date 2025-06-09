import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { code, redirect } = req.query;
	if (!code || typeof code !== 'string') {
		res.status(400).json({ errorMessage: "Missing 'code' query parameter" });
		return;
	}

	if (!redirect || typeof redirect !== 'string') {
		res.status(400).json({ errorMessage: "Missing 'redirect' query parameter" });
		return;
	}

	// Validate environment variables
	if (!process.env.TRAKT_CLIENT_ID || !process.env.TRAKT_CLIENT_SECRET) {
		console.error('Missing Trakt environment variables');
		res.status(500).json({ errorMessage: 'Server configuration error' });
		return;
	}

	const requestBody = {
		code,
		client_id: process.env.TRAKT_CLIENT_ID,
		client_secret: process.env.TRAKT_CLIENT_SECRET,
		redirect_uri: redirect,
		grant_type: 'authorization_code',
	};

	try {
		console.log('Trakt token exchange request:', {
			code: code.substring(0, 10) + '...',
			redirect_uri: redirect,
			client_id: process.env.TRAKT_CLIENT_ID?.substring(0, 10) + '...',
		});

		const response = await fetch('https://api.trakt.tv/oauth/token', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify(requestBody),
		});

		const data = await response.json();

		if (!response.ok) {
			console.error('Trakt token exchange failed:', {
				status: response.status,
				statusText: response.statusText,
				error: data,
			});
		}

		res.status(response.ok ? 200 : response.status).json(data);
	} catch (error) {
		console.error('Trakt token exchange error:', error);
		res.status(500).json({
			errorMessage: 'Failed to exchange authorization code',
			error: error instanceof Error ? error.message : 'Unknown error',
		});
	}
}
