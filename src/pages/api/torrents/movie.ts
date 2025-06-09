import { flattenAndRemoveDuplicates, sortByFileSize } from '@/services/mediasearch';
import { Repository } from '@/services/repository';
import { validateTokenWithHash } from '@/utils/token';
import { NextApiHandler } from 'next';

const db = new Repository();

// returns scraped results or marks the imdb id as requested
const handler: NextApiHandler = async (req, res) => {
	const { imdbId, dmmProblemKey, solution, onlyTrusted, maxSize, page } = req.query;

	if (
		!dmmProblemKey ||
		!(typeof dmmProblemKey === 'string') ||
		!solution ||
		!(typeof solution === 'string')
	) {
		res.status(403).json({ errorMessage: 'Authentication not provided' });
		return;
	} else if (!(await validateTokenWithHash(dmmProblemKey.toString(), solution.toString()))) {
		res.status(403).json({ errorMessage: 'Authentication error' });
		return;
	}

	if (!imdbId || !(typeof imdbId === 'string')) {
		res.status(400).json({ errorMessage: 'Missing "imdbId" query parameter' });
		return;
	}

	// Check if database is properly configured
	if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('[YOUR-PASSWORD]')) {
		console.warn('Database not properly configured - DATABASE_URL contains placeholder');
		res.status(200).json({
			results: [],
			warning:
				'Database not configured. Please set a valid DATABASE_URL in your environment variables.',
		});
		return;
	}

	try {
		const maxSizeInGB = maxSize ? parseInt(maxSize.toString()) : 0;
		const pageNum = page ? parseInt(page.toString()) : 0;
		const promises = [
			db.getScrapedTrueResults<any[]>(
				`movie:${imdbId.toString().trim()}`,
				maxSizeInGB,
				pageNum
			),
		];
		if (onlyTrusted !== 'true') {
			promises.push(
				db.getScrapedResults<any[]>(
					`movie:${imdbId.toString().trim()}`,
					maxSizeInGB,
					pageNum
				)
			);
		}
		const results = await Promise.all(promises);
		// should contain both results
		const searchResults = [...(results[0] || []), ...(results[1] || [])];
		if (searchResults) {
			let processedResults = flattenAndRemoveDuplicates(searchResults);
			processedResults = sortByFileSize(processedResults);
			res.status(200).json({ results: processedResults });
			return;
		}

		const isProcessing = await db.keyExists(`processing:${imdbId}`);
		if (isProcessing) {
			res.setHeader('status', 'processing').status(204).json(null);
			return;
		}

		await db.saveScrapedResults(`requested:${imdbId.toString().trim()}`, []);
		res.setHeader('status', 'requested').status(204).json(null);
	} catch (error: any) {
		console.error('Database connection error:', error);

		// Check if it's a database connection error
		if (
			error.message?.includes('connect') ||
			error.message?.includes('database') ||
			error.message?.includes('password')
		) {
			res.status(200).json({
				results: [],
				warning:
					'Database connection failed. Please check your DATABASE_URL configuration.',
			});
		} else {
			res.status(500).json({ errorMessage: error.message });
		}
	}
};

export default handler;
