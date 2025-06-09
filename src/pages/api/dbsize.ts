import { Repository } from '@/services/repository';
import { NextApiHandler } from 'next';

const cache = new Repository();

const handler: NextApiHandler = async (req, res) => {
	// Check if database is properly configured
	if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('[YOUR-PASSWORD]')) {
		console.warn('Database not properly configured - DATABASE_URL contains placeholder');
		res.status(200).json({
			contentSize: 0,
			processing: 0,
			requested: 0,
			warning: 'Database not configured',
		});
		return;
	}

	try {
		const [contentSize, processing, requested] = await Promise.all([
			cache.getContentSize(),
			cache.getProcessingCount(),
			cache.getRequestedCount(),
		]);

		res.status(200).json({ contentSize, processing, requested });
	} catch (err: any) {
		console.error('Database error in dbsize endpoint:', err.message);

		// Return default values instead of throwing 500 error
		res.status(200).json({
			contentSize: 0,
			processing: 0,
			requested: 0,
			warning: 'Database connection failed',
		});
	}
};

export default handler;
