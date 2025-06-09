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

	try {
		const requestBody = {
			refresh_token,
			client_id: process.env.TRAKT_CLIENT_ID,
			client_secret: process.env.TRAKT_CLIENT_SECRET,
			redirect_uri: '',
			grant_type: 'refresh_token',
		};

		const response = await fetch('https://api.trakt.tv/oauth/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(requestBody),
		});

		const data = await response.json();

		if (!response.ok) {
			console.error('Trakt token refresh failed:', data);
			res.status(response.status).json(data);
			return;
		}

		res.status(200).json(data);
	} catch (error) {
		console.error('Error in token refresh endpoint:', error);
		res.status(500).json({ errorMessage: 'Internal server error' });
	}
}
