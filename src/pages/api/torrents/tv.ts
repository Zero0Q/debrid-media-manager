import { flattenAndRemoveDuplicates, sortByFileSize } from '@/services/mediasearch';
import { Repository } from '@/services/repository';
import { validateTokenWithHash } from '@/utils/token';
import { NextApiHandler } from 'next';

const db = new Repository();

// returns scraped results or marks the imdb id as requested
const handler: NextApiHandler = async (req, res) => {
	const { imdbId, seasonNum, dmmProblemKey, solution, onlyTrusted, maxSize, page } = req.query;

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
	if (!seasonNum || !(typeof seasonNum === 'string')) {
		res.status(400).json({
			errorMessage: 'Missing "seasonNum" query parameter',
		});
		return;
	}

	try {
		const maxSizeInGB = maxSize ? parseInt(maxSize.toString()) : 0;
		const pageNum = page ? parseInt(page.toString()) : 0;
		const tvKey = `tv:${imdbId.toString().trim()}:${parseInt(seasonNum.toString().trim(), 10)}`;

		// Check if the keys exist before trying to query them to avoid errors
		const scrapedTrueExists = await db.keyExistsInScrapedTrue(tvKey);
		const scrapedExists = !onlyTrusted && (await db.keyExistsInScraped(tvKey));

		// Only fetch results from tables where the key exists
		const promises = [];
		if (scrapedTrueExists) {
			promises.push(db.getScrapedTrueResults<any[]>(tvKey, maxSizeInGB, pageNum));
		} else {
			promises.push([]);
		}

		if (!onlyTrusted) {
			if (scrapedExists) {
				promises.push(db.getScrapedResults<any[]>(tvKey, maxSizeInGB, pageNum));
			} else {
				promises.push([]);
			}
		}

		const results = await Promise.all(promises);
		// Safely combine results, ensuring we don't try to spread undefined values
		const searchResults = [
			...(Array.isArray(results[0]) ? results[0] : []),
			...(results[1] && Array.isArray(results[1]) ? results[1] : []),
		];

		// Always return a valid results array, even if empty
		let processedResults =
			searchResults.length > 0
				? sortByFileSize(flattenAndRemoveDuplicates(searchResults))
				: [];

		res.status(200).json({ results: processedResults });
		return;

		// The rest of the function for checking processing status and marking as requested
		// only runs if we didn't have any results to return
		const isProcessing = await db.keyExists(`processing:${imdbId.toString().trim()}`);
		if (isProcessing) {
			res.setHeader('status', 'processing').status(204).json(null);
			return;
		}

		await db.saveScrapedResults(`requested:${imdbId.toString().trim()}`, []);
		res.setHeader('status', 'requested').status(204).json(null);
	} catch (error: any) {
		console.error('encountered a db issue', error);
		res.status(500).json({ errorMessage: error.message });
	}
};

export default handler;
