import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		// Set CORS headers
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

		// Handle preflight OPTIONS request
		if (req.method === 'OPTIONS') {
			res.status(200).end();
			return;
		}

		// Only allow GET requests
		if (req.method !== 'GET') {
			return res.status(405).json({ error: 'Method Not Allowed' });
		}

		// Make a direct request to Real-Debrid's time endpoint
		const response = await axios.get('https://api.real-debrid.com/rest/1.0/time/iso');

		// Return the time string directly
		res.status(200).send(response.data);
	} catch (error: any) {
		console.error('Error fetching Real-Debrid time:', error);

		// Provide detailed error information
		const errorResponse = {
			error: 'Failed to fetch Real-Debrid time',
			details: error.message,
			status: error.response?.status,
			data: error.response?.data,
		};

		res.status(500).json(errorResponse);
	}
}
