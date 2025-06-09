import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';

interface TraktMediaItem {
	movie?: {
		title: string;
		year: number;
		ids: {
			trakt: number;
			slug: string;
			tvdb?: number;
			imdb?: string;
			tmdb: number;
		};
	};
	show?: {
		title: string;
		year: number;
		ids: {
			trakt: number;
			slug: string;
			tvdb?: number;
			imdb?: string;
			tmdb: number;
		};
	};
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(401).json({ error: 'Missing or invalid authorization header' });
	}

	const accessToken = authHeader.replace('Bearer ', '');
	const { userSlug, listId, type } = req.query;

	if (!userSlug || typeof userSlug !== 'string') {
		return res.status(400).json({ error: 'Missing userSlug parameter' });
	}

	if (!listId || typeof listId !== 'string') {
		return res.status(400).json({ error: 'Missing listId parameter' });
	}

	if (!process.env.TRAKT_CLIENT_ID) {
		console.error('Missing TRAKT_CLIENT_ID environment variable');
		return res.status(500).json({ error: 'Server configuration error' });
	}

	try {
		let apiEndpoint = `https://api.trakt.tv/users/${userSlug}/lists/${listId}/items`;
		if (type && typeof type === 'string') {
			apiEndpoint += `/${type}`;
		}

		let page = 1;
		const limit = 100;
		let allItems: TraktMediaItem[] = [];

		while (true) {
			const response = await axios.get<TraktMediaItem[]>(apiEndpoint, {
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

			const items = response.data;
			if (items.length === 0) break;

			allItems = [...allItems, ...items];
			if (items.length < limit) break;

			page++;
		}

		res.status(200).json(allItems);
	} catch (error: any) {
		console.error('Error fetching list items:', error.message);
		res.status(500).json({ error: 'Failed to fetch list items' });
	}
}
