import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	const { deviceCode } = req.query;

	if (!deviceCode || typeof deviceCode !== 'string') {
		return res.status(400).json({ error: 'Device code is required' });
	}

	try {
		const response = await axios.get(
			`https://api.real-debrid.com/oauth/v2/device/credentials?client_id=X245A4XAIBGVM&code=${deviceCode}`
		);

		res.status(200).json(response.data);
	} catch (error: any) {
		console.error('Error fetching credentials:', error.message);
		res.status(500).json({ error: 'Failed to fetch credentials' });
	}
}
