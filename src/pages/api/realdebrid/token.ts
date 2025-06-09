import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	const { clientId, clientSecret, refreshToken } = req.body;

	if (!clientId || !clientSecret || !refreshToken) {
		return res.status(400).json({ error: 'Missing required parameters' });
	}

	try {
		const params = new URLSearchParams();
		params.append('client_id', clientId);
		params.append('client_secret', clientSecret);
		params.append('code', refreshToken);
		params.append('grant_type', 'http://oauth.net/grant_type/device/1.0');

		const response = await axios.post(
			'https://api.real-debrid.com/oauth/v2/token',
			params.toString(),
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			}
		);

		res.status(200).json(response.data);
	} catch (error: any) {
		console.error('Error fetching access token:', error.message);
		res.status(500).json({ error: 'Failed to fetch access token' });
	}
}
