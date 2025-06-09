import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	// redirect to trakt.tv to get a code
	const { redirect } = req.query;

	if (!redirect || typeof redirect !== 'string') {
		return res.status(400).json({ error: 'Missing redirect parameter' });
	}

	if (!process.env.TRAKT_CLIENT_ID) {
		console.error('Missing TRAKT_CLIENT_ID environment variable');
		return res.status(500).json({ error: 'Server configuration error' });
	}

	// Ensure redirect URI ends with /trakt/callback
	const redirectUri = redirect.endsWith('/trakt/callback')
		? redirect
		: `${redirect}/trakt/callback`;

	const loginUrl = `https://trakt.tv/oauth/authorize?response_type=code&client_id=${process.env.TRAKT_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}`;

	console.log('Trakt OAuth redirect:', {
		client_id: process.env.TRAKT_CLIENT_ID.substring(0, 10) + '...',
		redirect_uri: redirectUri,
	});

	res.redirect(loginUrl);
}
