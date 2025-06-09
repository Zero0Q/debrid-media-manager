/**
 * Utility for handling CORS proxy requests
 *
 * This utility provides a reliable way to handle cross-origin requests by:
 * 1. First trying to make the request directly
 * 2. If that fails with a CORS error, using the app's internal anticors API endpoint
 * 3. Providing a consistent interface that works in both client and server environments
 */

import axios from 'axios';

/**
 * Makes a request through the appropriate CORS proxy based on the environment and needs
 *
 * @param url The URL to fetch data from
 * @param options Additional axios request options
 * @returns Promise with the axios response
 */
export async function fetchWithCorsProxy(url: string, options: any = {}) {
	try {
		// First attempt: try direct request
		return await axios({
			url,
			...options,
		});
	} catch (error: any) {
		// Check if error is CORS-related
		if (
			error.message?.includes('CORS') ||
			error.code === 'ERR_NETWORK' ||
			(error.response?.status === 0 && typeof window !== 'undefined')
		) {
			// Use our own anticors endpoint to bypass CORS issues
			const encodedUrl = encodeURIComponent(url);
			const proxyUrl = `/api/anticors?url=${encodedUrl}`;

			// Remove any headers that might cause issues when proxying
			const proxyOptions = { ...options };
			if (proxyOptions.headers) {
				delete proxyOptions.headers['Origin'];
				delete proxyOptions.headers['Referer'];
			}

			return await axios({
				url: proxyUrl,
				...proxyOptions,
			});
		}

		// If error is not CORS-related, rethrow it
		throw error;
	}
}

/**
 * Creates an axios instance that automatically handles CORS issues
 *
 * @param baseURL Optional base URL for all requests
 * @param defaultOptions Default axios options
 * @returns Axios instance with CORS handling
 */
export function createCorsProxyAxios(baseURL?: string, defaultOptions: any = {}) {
	const instance = axios.create({
		baseURL,
		...defaultOptions,
	});

	// Add request interceptor to handle CORS issues
	instance.interceptors.response.use(
		(response) => response,
		async (error) => {
			const originalRequest = error.config;

			// Prevent infinite loops
			if (originalRequest._retryCount && originalRequest._retryCount >= 1) {
				return Promise.reject(error);
			}

			// Check for CORS-related errors
			if (
				error.message?.includes('CORS') ||
				error.code === 'ERR_NETWORK' ||
				(error.response?.status === 0 && typeof window !== 'undefined')
			) {
				originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

				try {
					// Use our own anticors endpoint
					const encodedUrl = encodeURIComponent(originalRequest.url);
					const proxyUrl = `/api/anticors?url=${encodedUrl}`;

					return await axios({
						...originalRequest,
						url: proxyUrl,
					});
				} catch (proxyError) {
					return Promise.reject(proxyError);
				}
			}

			return Promise.reject(error);
		}
	);

	return instance;
}

export default {
	fetchWithCorsProxy,
	createCorsProxyAxios,
};
