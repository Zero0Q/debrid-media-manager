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

	try {
		const response = await axios.get('https://api.real-debrid.com/rest/1.0/user', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		res.status(200).json(response.data);
	} catch (error: any) {
		console.error('Error fetching user information:', error.message);
		res.status(500).json({ error: 'Failed to fetch user information' });
	}
}
