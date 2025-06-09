import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	try {
		const response = await axios.get('https://api.real-debrid.com/rest/1.0/time/iso');
		res.status(200).json(response.data);
	} catch (error: any) {
		console.error('Error fetching time:', error.message);
		res.status(500).json({ error: 'Failed to fetch time' });
	}
}
