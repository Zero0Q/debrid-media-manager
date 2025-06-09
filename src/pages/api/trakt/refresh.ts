import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		res.status(405).json({ errorMessage: 'Method not allowed' });
		return;
	}

	const { refresh_token } = req.body;
	if (!refresh_token || typeof refresh_token !== 'string') {
		res.status(400).json({ errorMessage: "Missing 'refresh_token' in request body" });
		return;
	}

	// Check if environment variables are available
	const clientId = process.env.TRAKT_CLIENT_ID;
	const clientSecret = process.env.TRAKT_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		console.error('Missing Trakt environment variables:', {
			hasClientId: !!clientId,
			hasClientSecret: !!clientSecret,
		});
		res.status(500).json({
			errorMessage: 'Server configuration error: Missing Trakt credentials',
		});
		return;
	}

	try {
		const requestBody = {
			refresh_token,
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: '',
			grant_type: 'refresh_token',
		};

		console.log('Attempting to refresh Trakt token...');

		const response = await fetch('https://api.trakt.tv/oauth/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(requestBody),
		});

		const data = await response.json();

		if (!response.ok) {
			console.error('Trakt token refresh failed:', {
				status: response.status,
				statusText: response.statusText,
				data: data,
			});
			res.status(response.status).json(data);
			return;
		}

		console.log('Trakt token refresh successful');
		res.status(200).json(data);
	} catch (error) {
		console.error('Error in token refresh endpoint:', error);
		res.status(500).json({ errorMessage: 'Internal server error' });
	}
}
