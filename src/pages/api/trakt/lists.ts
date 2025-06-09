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
	const { userSlug } = req.query;

	if (!userSlug || typeof userSlug !== 'string') {
		return res.status(400).json({ error: 'Missing userSlug parameter' });
	}

	if (!process.env.TRAKT_CLIENT_ID) {
		console.error('Missing TRAKT_CLIENT_ID environment variable');
		return res.status(500).json({ error: 'Server configuration error' });
	}

	try {
		const url = `https://api.trakt.tv/users/${userSlug}/lists`;
		let page = 1;
		const limit = 100;
		let allLists = [];

		while (true) {
			const response = await axios.get(url, {
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${accessToken}`,
					'trakt-api-version': '2',
					'trakt-api-key': process.env.TRAKT_CLIENT_ID,
				},
				params: {
					page,
					limit,
				},
			});

			const lists = response.data;
			if (lists.length === 0) break;

			allLists = [...allLists, ...lists];
			if (lists.length < limit) break;

			page++;
		}

		res.status(200).json(allLists);
	} catch (error: any) {
		console.error('Error fetching user personal lists:', error.message);
		res.status(500).json({ error: 'Failed to fetch user personal lists' });
	}
}
