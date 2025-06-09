import { NextApiRequest, NextApiResponse } from 'next';
import { Repository } from '../../../services/repository';
import { validateTokenWithHash } from '../../../utils/token';

function isValidTorrentHash(hash: string): boolean {
	return /^[a-fA-F0-9]{40}$/.test(hash);
}

// Rate limiting map to track requests per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute per IP

function getRateLimitKey(req: NextApiRequest): string {
	// Use X-Forwarded-For header if available (for proxied requests), otherwise use connection IP
	const forwarded = req.headers['x-forwarded-for'];
	const ip = forwarded
		? Array.isArray(forwarded)
			? forwarded[0]
			: forwarded.split(',')[0]
		: req.connection.remoteAddress;
	return ip || 'unknown';
}

function checkRateLimit(req: NextApiRequest): { allowed: boolean; remaining: number } {
	const key = getRateLimitKey(req);
	const now = Date.now();

	const rateLimitData = rateLimitMap.get(key);

	if (!rateLimitData || now > rateLimitData.resetTime) {
		// Reset or initialize rate limit
		rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
		return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
	}

	if (rateLimitData.count >= RATE_LIMIT_MAX) {
		return { allowed: false, remaining: 0 };
	}

	rateLimitData.count++;
	return { allowed: true, remaining: RATE_LIMIT_MAX - rateLimitData.count };
}

const db = new Repository();

// fetch availability with hashes, no IMDb ID constraint
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	// Check rate limit first
	const { allowed, remaining } = checkRateLimit(req);
	if (!allowed) {
		return res.status(429).json({
			error: 'Too many requests. Please try again later.',
			retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000),
		});
	}

	// Add rate limit headers
	res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX);
	res.setHeader('X-RateLimit-Remaining', remaining);

	try {
		const { dmmProblemKey, solution, hashes } = req.body;

		if (
			!dmmProblemKey ||
			!(typeof dmmProblemKey === 'string') ||
			!solution ||
			!(typeof solution === 'string')
		) {
			res.status(403).json({ error: 'Authentication not provided' });
			return;
		} else if (!(await validateTokenWithHash(dmmProblemKey.toString(), solution.toString()))) {
			res.status(403).json({ error: 'Authentication error' });
			return;
		}

		// Validate hashes array
		if (!Array.isArray(hashes)) {
			return res.status(400).json({ error: 'Hashes must be an array' });
		}

		if (hashes.length === 0) {
			return res.status(200).json({ available: [] });
		}

		if (hashes.length > 100) {
			return res.status(400).json({ error: 'Maximum 100 hashes allowed' });
		}

		// Validate each hash
		const invalidHash = hashes.find((hash) => !isValidTorrentHash(hash));
		if (invalidHash) {
			return res.status(400).json({
				error: 'Invalid hash format',
				hash: invalidHash,
			});
		}

		// Look up hashes without IMDb ID constraint using the new method
		const availableHashes = await db.checkAvailabilityByHashes(hashes);

		// Return array of found hashes with their file details
		return res.status(200).json({ available: availableHashes });
	} catch (error) {
		console.error('Error checking available hashes:', error);
		return res.status(500).json({ error: 'Failed to check available hashes' });
	}
}
