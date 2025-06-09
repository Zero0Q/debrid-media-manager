import axios from 'axios';
import getConfig from 'next/config';
import { isBrowser } from '../utils/checks';

const { publicRuntimeConfig: config } = getConfig();

// Check if we're in production and browser environment
const isProduction = process.env.NODE_ENV === 'production' && isBrowser();

// Helper function to construct URLs correctly for the local proxy
function getApiUrl(endpoint: string): string {
	if (isProduction) {
		// For production browser environment, use the local proxy
		return `/api/localproxy?url=${encodeURIComponent(`https://api.trakt.tv${endpoint}`)}`;
	}
	// For development or server-side, use the direct API URL
	return `https://api.trakt.tv${endpoint}`;
}

export interface TraktMedia {
	title: string;
	year: number;
	ids?: {
		trakt: number;
		slug: string;
		tvdb?: number;
		imdb?: string;
		tmdb: number;
	};
}

// Generic Media Item Interface (used in responses)
export interface TraktMediaItem {
	movie?: TraktMedia;
	show?: TraktMedia;
}

export interface TraktSearchResult {
	type: 'movie' | 'show' | 'episode' | 'person';
	score: number;
	movie?: TraktMedia;
	show?: TraktMedia;
}

// Search suggestions function
export const getSearchSuggestions = async (
	query: string,
	types: ('movie' | 'show')[] = ['movie', 'show'],
	client_id: string
): Promise<TraktSearchResult[]> => {
	if (!query) return [];

	try {
		const headers = {
			'Content-Type': 'application/json',
			'trakt-api-version': '2',
			'trakt-api-key': client_id,
		};

		const typeParam = types.join(',');
		const endpoint = `/search/${typeParam}?query=${encodeURIComponent(query)}`;
		const url = getApiUrl(endpoint);

		const response = await axios.get<TraktSearchResult[]>(url, { headers });

		return response.data;
	} catch (error: any) {
		console.error('Error fetching search suggestions:', error.message);
		return [];
	}
};

// Generic Function to Fetch Media Data
export const getMediaData = async (
	client_id: string,
	endpoint: string
): Promise<TraktMediaItem[]> => {
	try {
		const headers = {
			'Content-Type': 'application/json',
			'trakt-api-version': 2,
			'trakt-api-key': client_id,
		};

		const url = getApiUrl(endpoint);
		const response = await axios.get<TraktMediaItem[]>(url, { headers });

		return response.data;
	} catch (error: any) {
		console.error(`Error fetching data from ${endpoint}:`, error.message);
		throw error;
	}
};

// Functions for genre-based media fetching
export const getTrendingByGenre = async (
	client_id: string,
	genre: string,
	type: 'movies' | 'shows',
	limit: number = 20
): Promise<TraktMediaItem[]> => {
	try {
		const headers = {
			'Content-Type': 'application/json',
			'trakt-api-version': '2',
			'trakt-api-key': client_id,
		};

		const endpoint = `/${type}/trending?genres=${genre}&limit=${limit}`;
		const url = getApiUrl(endpoint);

		const response = await axios.get<TraktMediaItem[]>(url, { headers });

		return response.data;
	} catch (error: any) {
		console.error(`Error fetching trending ${type} by genre:`, error.message);
		return [];
	}
};

export const getPopularByGenre = async (
	client_id: string,
	genre: string,
	type: 'movies' | 'shows',
	limit: number = 20
): Promise<TraktMediaItem[]> => {
	try {
		const headers = {
			'Content-Type': 'application/json',
			'trakt-api-version': '2',
			'trakt-api-key': client_id,
		};

		const endpoint = `/${type}/popular?genres=${genre}&limit=${limit}`;
		const url = getApiUrl(endpoint);

		const response = await axios.get<TraktMedia[]>(url, { headers });

		// Transform the response to match the expected format
		return response.data.map((item) => ({
			[type === 'movies' ? 'movie' : 'show']: {
				title: item.title,
				year: item.year,
				ids: item.ids,
			},
		}));
	} catch (error: any) {
		console.error(`Error fetching popular ${type} by genre:`, error.message);
		return [];
	}
};

export interface TraktUser {
	user: {
		username: string;
		private: boolean;
		name: string;
		vip: boolean;
		vip_ep: boolean;
		ids: {
			slug: string;
			uuid: string;
		};
		joined_at: string;
		location: string;
		about: string;
		gender: string;
		age: number;
		images: {
			avatar: {
				full: string;
			};
		};
		vip_og: boolean;
		vip_years: number;
	};
	account: {
		timezone: string;
		date_format: string;
		time_24hr: boolean;
		cover_image: string;
	};
	sharing_text: {
		watching: string;
		watched: string;
		rated: string;
	};
	limits: {
		list: {
			count: number;
			item_count: number;
		};
		watchlist: {
			item_count: number;
		};
		favorites: {
			item_count: number;
		};
	};
}

export const getTraktUser = async (accessToken: string) => {
	try {
		const headers = {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`,
			'trakt-api-version': '2',
			'trakt-api-key': config.traktClientId,
		};

		// Use the helper function to get the correct URL
		const url = getApiUrl('/users/settings');

		console.log('Fetching Trakt user settings from URL:', url);
		console.log('With headers:', JSON.stringify(headers));

		const response = await axios.get<TraktUser>(url, { headers });

		if (response.status !== 200) {
			throw new Error(`Error: ${response.status}`);
		}

		const data = response.data;
		return data;
	} catch (error: any) {
		console.error(`Failed to fetch Trakt user settings:`, error);

		// Add more detailed error logging
		if (error.response) {
			console.error('Error response:', {
				status: error.response.status,
				data: error.response.data,
				headers: error.response.headers,
			});
		}

		throw error;
	}
};

// Add token refresh functionality
export interface TraktTokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
	scope: string;
}

export const refreshTraktToken = async (refreshToken: string): Promise<TraktTokenResponse> => {
	try {
		// Use the server-side API endpoint for token refresh
		const response = await fetch('/api/trakt/refresh', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				refresh_token: refreshToken,
			}),
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(
				`Token refresh failed: ${response.status} ${response.statusText}. ${errorData.errorMessage || ''}`
			);
		}

		const data = await response.json();
		return data;
	} catch (error) {
		console.error('Error refreshing Trakt token:', error);
		throw error;
	}
};

// Enhanced getTraktUser function with automatic token refresh
export const getTraktUserWithRefresh = async (
	accessToken: string,
	refreshToken?: string,
	onTokenRefresh?: (newTokens: TraktTokenResponse) => void
): Promise<TraktUser> => {
	try {
		// Try with current token first
		return await getTraktUser(accessToken);
	} catch (error: any) {
		// If 401 Unauthorized and we have a refresh token, try to refresh
		if (error.response?.status === 401 && refreshToken) {
			console.log('Access token expired, attempting to refresh...');

			try {
				const newTokens = await refreshTraktToken(refreshToken);
				console.log('Successfully refreshed Trakt tokens');

				// Call the callback to update tokens in storage
				if (onTokenRefresh) {
					onTokenRefresh(newTokens);
				}

				// Retry with new token
				return await getTraktUser(newTokens.access_token);
			} catch (refreshError) {
				console.error('Failed to refresh Trakt token:', refreshError);
				throw new Error('Authentication failed. Please re-authenticate with Trakt.');
			}
		}

		// Re-throw original error if not 401 or no refresh token
		throw error;
	}
};

interface TraktListIds {
	trakt: number;
	slug: string;
}

interface TraktListContainer {
	list: TraktList;
}

interface TraktList {
	name: string;
	description: string;
	privacy: string;
	share_link: string;
	type: string;
	display_numbers: boolean;
	allow_comments: boolean;
	sort_by: string;
	sort_how: string;
	created_at: string;
	updated_at: string;
	item_count: number;
	comment_count: number;
	likes: number;
	ids: TraktListIds;
	user: {
		username: string;
		private: boolean;
		name: string;
		vip: boolean;
		vip_ep: boolean;
		ids: {
			slug: string;
		};
	};
}

export const getUsersPersonalLists = async (
	accessToken: string,
	userSlug: string
): Promise<TraktList[]> => {
	const endpoint = `/users/${userSlug}/lists`;
	let page = 1;
	const limit = 100; // Maximum items per page
	let allLists: TraktList[] = [];

	try {
		while (true) {
			const url = getApiUrl(`${endpoint}?page=${page}&limit=${limit}`);
			const response = await axios.get<TraktList[]>(url, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
					'trakt-api-version': '2',
					'trakt-api-key': config.traktClientId,
				},
			});

			const lists = response.data;
			if (lists.length === 0) break;

			allLists = [...allLists, ...lists];
			if (lists.length < limit) break;

			page++;
		}
		return allLists;
	} catch (error) {
		console.error("Error fetching user's personal lists:", error);
		throw error;
	}
};

export const getLikedLists = async (
	accessToken: string,
	userSlug: string
): Promise<TraktListContainer[]> => {
	const endpoint = `/users/${userSlug}/likes/lists`;
	let page = 1;
	const limit = 100; // Maximum items per page
	let allLists: TraktListContainer[] = [];

	try {
		while (true) {
			const url = getApiUrl(`${endpoint}?page=${page}&limit=${limit}`);
			const response = await axios.get<TraktListContainer[]>(url, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
					'trakt-api-version': '2',
					'trakt-api-key': config.traktClientId,
				},
			});

			const lists = response.data;
			if (lists.length === 0) break;

			allLists = [...allLists, ...lists];
			if (lists.length < limit) break;

			page++;
		}
		return allLists;
	} catch (error) {
		console.error("Error fetching user's liked lists:", error);
		throw error;
	}
};

export async function fetchListItems(
	accessToken: string,
	userSlug: string,
	listId: number,
	type?: string
): Promise<TraktMediaItem[]> {
	let endpoint = `/users/${userSlug}/lists/${listId}/items`;
	if (type) {
		endpoint += `/${type}`;
	}

	let page = 1;
	const limit = 100; // Maximum items per page
	let allItems: TraktMediaItem[] = [];

	try {
		while (true) {
			const url = getApiUrl(`${endpoint}?page=${page}&limit=${limit}`);
			const response = await axios.get<TraktMediaItem[]>(url, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
					'trakt-api-version': '2',
					'trakt-api-key': config.traktClientId,
				},
			});

			const items = response.data;
			if (items.length === 0) break;

			allItems = [...allItems, ...items];
			if (items.length < limit) break;

			page++;
		}
		return allItems;
	} catch (error) {
		console.error('Error fetching list items:', error);
		throw new Error('Error fetching list items');
	}
}

// New interfaces for watchlist items
export interface TraktWatchlistItem {
	rank: number;
	id: number;
	listed_at: string;
	notes: string | null;
	type: 'movie' | 'show';
	movie?: TraktMedia;
	show?: TraktMedia;
}

// New interface for collection items
export interface TraktCollectionItem {
	last_collected_at: string;
	last_updated_at: string;
	movie?: TraktMedia;
	show?: TraktMedia;
}

// New function to fetch watchlist movies
export const getWatchlistMovies = async (accessToken: string): Promise<TraktWatchlistItem[]> => {
	const endpoint = '/sync/watchlist/movies/added';
	const url = getApiUrl(endpoint);

	try {
		const response = await axios.get<TraktWatchlistItem[]>(url, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
				'trakt-api-version': '2',
				'trakt-api-key': config.traktClientId,
			},
		});
		return response.data;
	} catch (error) {
		console.error('Error fetching watchlist movies:', error);
		throw error;
	}
};

// New function to fetch watchlist shows
export const getWatchlistShows = async (accessToken: string): Promise<TraktWatchlistItem[]> => {
	const endpoint = '/sync/watchlist/shows/added';
	const url = getApiUrl(endpoint);

	try {
		const response = await axios.get<TraktWatchlistItem[]>(url, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
				'trakt-api-version': '2',
				'trakt-api-key': config.traktClientId,
			},
		});
		return response.data;
	} catch (error) {
		console.error('Error fetching watchlist shows:', error);
		throw error;
	}
};

// New function to fetch collection movies
export const getCollectionMovies = async (accessToken: string): Promise<TraktCollectionItem[]> => {
	const endpoint = '/sync/collection/movies';
	const url = getApiUrl(endpoint);

	try {
		const response = await axios.get<TraktCollectionItem[]>(url, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
				'trakt-api-version': '2',
				'trakt-api-key': config.traktClientId,
			},
		});
		return response.data;
	} catch (error) {
		console.error('Error fetching collection movies:', error);
		throw error;
	}
};

// New function to fetch collection shows
export const getCollectionShows = async (accessToken: string): Promise<TraktCollectionItem[]> => {
	const endpoint = '/sync/collection/shows';
	const url = getApiUrl(endpoint);

	try {
		const response = await axios.get<TraktCollectionItem[]>(url, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
				'trakt-api-version': '2',
				'trakt-api-key': config.traktClientId,
			},
		});
		return response.data;
	} catch (error) {
		console.error('Error fetching collection shows:', error);
		throw error;
	}
};
