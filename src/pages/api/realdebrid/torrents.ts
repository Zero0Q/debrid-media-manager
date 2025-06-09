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
	const { page = '1', limit = '1' } = req.query;

	try {
		const response = await axios.get('https://api.real-debrid.com/rest/1.0/torrents', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
			params: { page, limit },
		});

		// Forward the x-total-count header for pagination
		if (response.headers['x-total-count']) {
			res.setHeader('x-total-count', response.headers['x-total-count']);
		}

		res.status(200).json(response.data);
	} catch (error: any) {
		console.error('Error fetching user torrents list:', error.message);
		res.status(500).json({ error: 'Failed to fetch user torrents list' });
	}
}
