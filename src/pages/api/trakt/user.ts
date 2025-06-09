import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(401).json({ error: 'Missing or invalid authorization header' });
	}

	const accessToken = authHeader.replace('Bearer ', '');

	if (!process.env.TRAKT_CLIENT_ID) {
		console.error('Missing TRAKT_CLIENT_ID environment variable');
		return res.status(500).json({ error: 'Server configuration error' });
	}

	try {
		const response = await axios.get('https://api.trakt.tv/users/settings', {
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
				'trakt-api-version': '2',
				'trakt-api-key': process.env.TRAKT_CLIENT_ID,
			},
		});

		res.status(200).json(response.data);
	} catch (error: any) {
		console.error('Error fetching Trakt user settings:', error.message);
		res.status(500).json({ error: 'Failed to fetch Trakt user settings' });
	}
}
