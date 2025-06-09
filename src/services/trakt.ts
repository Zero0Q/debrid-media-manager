import axios from 'axios';
import getConfig from 'next/config';

const TRAKT_API_URL = 'https://api.trakt.tv';

const { publicRuntimeConfig: config } = getConfig();
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
		const response = await axios.get<TraktSearchResult[]>(
			`${TRAKT_API_URL}/search/${typeParam}?query=${encodeURIComponent(query)}`,
			{ headers }
		);

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

		const response = await axios.get<TraktMediaItem[]>(`${TRAKT_API_URL}/${endpoint}`, {
			headers,
		});

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

		const response = await axios.get<TraktMediaItem[]>(
			`${TRAKT_API_URL}/${type}/trending?genres=${genre}&limit=${limit}`,
			{ headers }
		);

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

		const response = await axios.get<TraktMedia[]>(
			`${TRAKT_API_URL}/${type}/popular?genres=${genre}&limit=${limit}`,
			{ headers }
		);

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
		console.log('getTraktUser: Using API route /api/trakt/user');
		// Use our API route instead of direct Trakt API call
		const response = await axios.get<TraktUser>('/api/trakt/user', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		console.log('getTraktUser: Success!', response.data);
		return response.data;
	} catch (error: any) {
		console.error('Error fetching Trakt user settings from API route:', error.message);
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
	try {
		console.log('getUsersPersonalLists: Using API route /api/trakt/lists');
		const response = await axios.get<TraktList[]>('/api/trakt/lists', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
			params: {
				userSlug,
			},
		});

		console.log('getUsersPersonalLists: Success!', response.data);
		return response.data;
	} catch (error: any) {
		console.error("Error fetching user's personal lists:", error);
		throw error;
	}
};

export const getLikedLists = async (
	accessToken: string,
	userSlug: string
): Promise<TraktListContainer[]> => {
	try {
		console.log('getLikedLists: Using API route /api/trakt/liked-lists');
		const response = await axios.get<TraktListContainer[]>('/api/trakt/liked-lists', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
			params: {
				userSlug,
			},
		});

		console.log('getLikedLists: Success!', response.data);
		return response.data;
	} catch (error: any) {
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
	try {
		console.log('fetchListItems: Using API route /api/trakt/list-items');
		const response = await axios.get<TraktMediaItem[]>('/api/trakt/list-items', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
			params: {
				userSlug,
				listId: listId.toString(),
				...(type && { type }),
			},
		});

		console.log('fetchListItems: Success!', response.data);
		return response.data;
	} catch (error: any) {
		console.error('Error fetching list items:', error);
		throw error;
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

// New function to fetch watchlist movies
export const getWatchlistMovies = async (accessToken: string): Promise<TraktWatchlistItem[]> => {
	try {
		console.log('getWatchlistMovies: Using API route /api/trakt/watchlist');
		const response = await axios.get<TraktWatchlistItem[]>('/api/trakt/watchlist', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
			params: {
				type: 'movies',
			},
		});

		console.log('getWatchlistMovies: Success!', response.data);
		return response.data;
	} catch (error: any) {
		console.error('Error fetching watchlist movies:', error);
		throw error;
	}
};

// New function to fetch watchlist shows
export const getWatchlistShows = async (accessToken: string): Promise<TraktWatchlistItem[]> => {
	try {
		console.log('getWatchlistShows: Using API route /api/trakt/watchlist');
		const response = await axios.get<TraktWatchlistItem[]>('/api/trakt/watchlist', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
			params: {
				type: 'shows',
			},
		});

		console.log('getWatchlistShows: Success!', response.data);
		return response.data;
	} catch (error: any) {
		console.error('Error fetching watchlist shows:', error);
		throw error;
	}
};

// New interface for collection items
export interface TraktCollectionItem {
	last_collected_at: string;
	last_updated_at: string;
	movie?: TraktMedia;
	show?: TraktMedia;
}

// New function to fetch collection movies
export const getCollectionMovies = async (accessToken: string): Promise<TraktCollectionItem[]> => {
	try {
		console.log('getCollectionMovies: Using API route /api/trakt/collection');
		const response = await axios.get<TraktCollectionItem[]>('/api/trakt/collection', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
			params: {
				type: 'movies',
			},
		});

		console.log('getCollectionMovies: Success!', response.data);
		return response.data;
	} catch (error: any) {
		console.error('Error fetching collection movies:', error);
		throw error;
	}
};

// New function to fetch collection shows
export const getCollectionShows = async (accessToken: string): Promise<TraktCollectionItem[]> => {
	try {
		console.log('getCollectionShows: Using API route /api/trakt/collection');
		const response = await axios.get<TraktCollectionItem[]>('/api/trakt/collection', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
			params: {
				type: 'shows',
			},
		});

		console.log('getCollectionShows: Success!', response.data);
		return response.data;
	} catch (error: any) {
		console.error('Error fetching collection shows:', error);
		throw error;
	}
};
