import { TorrentInfoResponse } from '@/services/types';

export async function submitAvailability(
	dmmProblemKey: string,
	solution: string,
	torrentInfo: TorrentInfoResponse,
	imdbId: string
) {
	// filter out any torrents that are not downloaded for now
	if (torrentInfo.status !== 'downloaded') {
		return;
	}

	try {
		const response = await fetch('/api/availability', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				...torrentInfo,
				imdbId,
				dmmProblemKey,
				solution,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to submit availability');
		}

		return await response.json();
	} catch (error) {
		console.error('Error submitting availability:', error);
		throw error;
	}
}

export async function checkAvailability(
	dmmProblemKey: string,
	solution: string,
	imdbId: string,
	hashes: string[]
) {
	const maxRetries = 3;
	let retryCount = 0;

	while (retryCount <= maxRetries) {
		try {
			const response = await fetch('/api/availability/check', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					imdbId,
					hashes,
					dmmProblemKey,
					solution,
				}),
			});

			// Handle non-JSON responses (like HTML error pages)
			const contentType = response.headers.get('content-type');
			const isJson = contentType && contentType.includes('application/json');

			if (!response.ok) {
				let errorMessage = 'Failed to check availability';

				if (response.status === 429) {
					const retryAfter = response.headers.get('retry-after') || '60';
					errorMessage = `Rate limit exceeded. Please try again in ${retryAfter} seconds.`;

					// If we're rate limited and have retries left, wait and retry
					if (retryCount < maxRetries) {
						const delay = Math.min(
							Math.pow(2, retryCount) * 1000 + Math.random() * 1000,
							30000
						);
						console.log(
							`Rate limited, retrying in ${Math.ceil(delay / 1000)}s (attempt ${retryCount + 1}/${maxRetries})`
						);
						await new Promise((resolve) => setTimeout(resolve, delay));
						retryCount++;
						continue;
					}
				} else if (response.status === 403) {
					errorMessage = 'Authentication failed. Please refresh the page.';
				} else if (isJson) {
					try {
						const error = await response.json();
						errorMessage = error.error || error.errorMessage || errorMessage;
					} catch {
						// If JSON parsing fails, use default message
					}
				}

				throw new Error(errorMessage);
			}

			if (!isJson) {
				console.error('Non-JSON response received:', await response.text());
				throw new Error('Invalid response format from server');
			}

			return await response.json();
		} catch (error) {
			if (retryCount >= maxRetries) {
				console.error('Error checking availability:', error);
				throw error;
			}

			// For network errors, retry with exponential backoff
			if (error instanceof TypeError && error.message.includes('fetch')) {
				const delay = Math.min(
					Math.pow(2, retryCount) * 1000 + Math.random() * 1000,
					15000
				);
				console.log(
					`Network error, retrying in ${Math.ceil(delay / 1000)}s (attempt ${retryCount + 1}/${maxRetries})`
				);
				await new Promise((resolve) => setTimeout(resolve, delay));
				retryCount++;
				continue;
			}

			throw error;
		}
	}
}

export async function checkAvailabilityByHashes(
	dmmProblemKey: string,
	solution: string,
	hashes: string[]
) {
	const maxRetries = 3;
	let retryCount = 0;

	while (retryCount <= maxRetries) {
		try {
			const response = await fetch('/api/availability/check2', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					hashes,
					dmmProblemKey,
					solution,
				}),
			});

			// Handle non-JSON responses (like HTML error pages)
			const contentType = response.headers.get('content-type');
			const isJson = contentType && contentType.includes('application/json');

			if (!response.ok) {
				let errorMessage = 'Failed to check availability by hashes';

				if (response.status === 429) {
					const retryAfter = response.headers.get('retry-after') || '60';
					errorMessage = `Rate limit exceeded. Please try again in ${retryAfter} seconds.`;

					// If we're rate limited and have retries left, wait and retry
					if (retryCount < maxRetries) {
						const delay = Math.min(
							Math.pow(2, retryCount) * 1000 + Math.random() * 1000,
							30000
						);
						console.log(
							`Rate limited, retrying in ${Math.ceil(delay / 1000)}s (attempt ${retryCount + 1}/${maxRetries})`
						);
						await new Promise((resolve) => setTimeout(resolve, delay));
						retryCount++;
						continue;
					}
				} else if (response.status === 403) {
					errorMessage = 'Authentication failed. Please refresh the page.';
				} else if (isJson) {
					try {
						const error = await response.json();
						errorMessage = error.error || error.errorMessage || errorMessage;
					} catch {
						// If JSON parsing fails, use default message
					}
				}

				throw new Error(errorMessage);
			}

			if (!isJson) {
				console.error('Non-JSON response received:', await response.text());
				throw new Error('Invalid response format from server');
			}

			return await response.json();
		} catch (error) {
			if (retryCount >= maxRetries) {
				console.error('Error checking availability by hashes:', error);
				throw error;
			}

			// For network errors, retry with exponential backoff
			if (error instanceof TypeError && error.message.includes('fetch')) {
				const delay = Math.min(
					Math.pow(2, retryCount) * 1000 + Math.random() * 1000,
					15000
				);
				console.log(
					`Network error, retrying in ${Math.ceil(delay / 1000)}s (attempt ${retryCount + 1}/${maxRetries})`
				);
				await new Promise((resolve) => setTimeout(resolve, delay));
				retryCount++;
				continue;
			}

			throw error;
		}
	}
}
