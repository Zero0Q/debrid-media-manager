import '@/styles/globals.css';
import axios from 'axios';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';

export default function App({ Component, pageProps }: AppProps) {
	useEffect(() => {
		// Configure global axios interceptors to handle CORS issues
		axios.interceptors.response.use(
			(response) => response,
			async (error) => {
				const originalRequest = error.config;

				// Prevent infinite loops
				if (originalRequest._retryCount && originalRequest._retryCount >= 1) {
					return Promise.reject(error);
				}

				// Check for CORS or network-related errors
				if (
					error.message?.includes('CORS') ||
					error.code === 'ERR_NETWORK' ||
					error.code === 'ERR_NAME_NOT_RESOLVED' ||
					(error.response?.status === 0 && typeof window !== 'undefined')
				) {
					originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

					try {
						// Use our own anticors endpoint
						const url = originalRequest.url;
						const isFullUrl = url.includes('://');
						const encodedUrl = encodeURIComponent(
							isFullUrl ? url : window.location.origin + url
						);
						const proxyUrl = `/api/anticors?url=${encodedUrl}`;

						// Create a new request using our internal proxy
						const proxyConfig = { ...originalRequest, url: proxyUrl };

						// Remove any headers that might cause issues when proxying
						if (proxyConfig.headers) {
							delete proxyConfig.headers['Origin'];
							delete proxyConfig.headers['Referer'];
						}

						return await axios(proxyConfig);
					} catch (proxyError) {
						// If proxy also fails, continue with the original error
						return Promise.reject(proxyError);
					}
				}

				return Promise.reject(error);
			}
		);
	}, []);

	return (
		<>
			<Toaster position="bottom-right" />
			<Component {...pageProps} />
		</>
	);
}
