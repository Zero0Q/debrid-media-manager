import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	try {
		const response = await axios.get(
			`https://api.real-debrid.com/oauth/v2/device/code?client_id=X245A4XAIBGVM&new_credentials=yes`
		);

		res.status(200).json(response.data);
	} catch (error: any) {
		console.error('Error fetching device code:', error.message);
		res.status(500).json({ error: 'Failed to fetch device code' });
	}
}
