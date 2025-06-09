import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getAllDebridUser } from '../services/allDebrid';
import { getCurrentUser as getRealDebridUser, getToken } from '../services/realDebrid';
import { TorBoxUser, getUserData } from '../services/torbox';
import { TraktTokenResponse, TraktUser, getTraktUserWithRefresh } from '../services/trakt';
import { clearRdKeys } from '../utils/clearLocalStorage';
import useLocalStorage from './localStorage';

export interface RealDebridUser {
	id: number;
	username: string;
	email: string;
	points: number;
	locale: string;
	avatar: string;
	type: 'premium' | 'free';
	premium: number;
	expiration: string;
}

export interface AllDebridUser {
	username: string;
	email: string;
	isPremium: boolean;
	isSubscribed: boolean;
	isTrial: boolean;
	premiumUntil: number;
	lang: string;
	preferedDomain: string;
	fidelityPoints: number;
}

// Simplified hook that handles RealDebrid auth
const useRealDebrid = () => {
	const [user, setUser] = useState<RealDebridUser | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const [loading, setLoading] = useState(true);
	const [token, setToken] = useLocalStorage<string>('rd:accessToken');
	const [clientId] = useLocalStorage<string>('rd:clientId');
	const [clientSecret] = useLocalStorage<string>('rd:clientSecret');
	const [refreshToken] = useLocalStorage<string>('rd:refreshToken');
	const [isRefreshing, setIsRefreshing] = useState(false);

	useEffect(() => {
		const auth = async () => {
			if (!refreshToken || !clientId || !clientSecret) {
				setLoading(false);
				return;
			}

			try {
				// Try current token first
				if (token) {
					try {
						const user = await getRealDebridUser(token);
						setUser(user as RealDebridUser);
						setError(null);
						setLoading(false);
						return;
					} catch {} // Token invalid, continue to refresh
				}

				// Get new token
				setIsRefreshing(true);
				const { access_token, expires_in } = await getToken(
					clientId,
					clientSecret,
					refreshToken
				);
				setToken(access_token, expires_in);
				const user = await getRealDebridUser(access_token);
				setUser(user as RealDebridUser);
				setError(null);
				setIsRefreshing(false);
			} catch (e) {
				clearRdKeys();
				setError(e as Error);
				setIsRefreshing(false);
			} finally {
				setLoading(false);
			}
		};

		auth();
	}, [token, refreshToken, clientId, clientSecret, setToken]);

	return { user, error, loading, isRefreshing, hasAuth: !!token };
};

// Separate hooks for other services
const useAllDebrid = () => {
	const [user, setUser] = useState<AllDebridUser | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const [token, setToken] = useLocalStorage<string>('ad:apiKey');

	useEffect(() => {
		if (!token) return;

		getAllDebridUser(token)
			.then((user) => setUser(user as AllDebridUser))
			.catch((e) => setError(e as Error));
	}, [token, setToken]); // Add setToken to dependency array

	return { user, error, hasAuth: !!token };
};

const useTorBox = () => {
	const [user, setUser] = useState<TorBoxUser | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const [token] = useLocalStorage<string>('tb:apiKey');

	useEffect(() => {
		if (!token) return;

		getUserData(token)
			.then((response) => response.success && setUser(response.data))
			.catch((e) => setError(e as Error));
	}, [token]);

	return { user, error, hasAuth: !!token };
};

const useTrakt = () => {
	const [user, setUser] = useState<TraktUser | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const [loading, setLoading] = useState(true);
	const [isAuthenticating, setIsAuthenticating] = useState(false);
	const [token, setToken] = useLocalStorage<string>('trakt:accessToken');
	const [refreshToken, setRefreshToken] = useLocalStorage<string>('trakt:refreshToken');
	const [_, setUserSlug] = useLocalStorage<string>('trakt:userSlug');

	useEffect(() => {
		// Prevent multiple simultaneous authentication attempts
		if (isAuthenticating) {
			return;
		}

		if (!token) {
			setLoading(false);
			return;
		}

		const auth = async () => {
			setIsAuthenticating(true);
			try {
				const handleTokenRefresh = (newTokens: TraktTokenResponse) => {
					console.log('Updating Trakt tokens in localStorage');
					// Use a small delay to ensure state updates are processed
					setTimeout(() => {
						setToken(newTokens.access_token, newTokens.expires_in);
						// CRITICAL FIX: Always update the refresh token when provided
						if (newTokens.refresh_token) {
							setRefreshToken(newTokens.refresh_token);
							console.log('Updated refresh token in localStorage');
						}
					}, 100);
				};

				const userData = await getTraktUserWithRefresh(
					token,
					refreshToken || undefined,
					handleTokenRefresh
				);
				setUser(userData);
				setUserSlug(userData.user.ids.slug);
				setError(null);
			} catch (e) {
				console.error('Trakt authentication failed:', e);
				setError(e as Error);
				// Clear tokens on auth failure
				if ((e as Error).message.includes('Please re-authenticate')) {
					setToken('');
					// Don't clear refresh token immediately - user might want to try again
				}
			} finally {
				setLoading(false);
				setIsAuthenticating(false);
			}
		};

		auth();
	}, [token, isAuthenticating, refreshToken, setToken, setRefreshToken, setUserSlug]); // Add missing dependencies

	return { user, error, loading, hasAuth: !!token };
};

// Backward compatibility hook for withAuth.tsx
export const useRealDebridAccessToken = (): [string | null, boolean, boolean] => {
	const { user, loading, isRefreshing } = useRealDebrid();
	const [token] = useLocalStorage<string>('rd:accessToken');
	return [token, loading, isRefreshing];
};

export const useAllDebridApiKey = () => {
	const [apiKey] = useLocalStorage<string>('ad:apiKey');
	return apiKey;
};

export const useTorBoxAccessToken = () => {
	const [apiKey] = useLocalStorage<string>('tb:apiKey');
	return apiKey;
};

// Main hook that combines all services
export const useCurrentUser = () => {
	const rd = useRealDebrid();
	const ad = useAllDebrid();
	const tb = useTorBox();
	const trakt = useTrakt();

	return {
		rdUser: rd.user,
		rdError: rd.error,
		hasRDAuth: rd.hasAuth,
		rdIsRefreshing: rd.isRefreshing,
		adUser: ad.user,
		adError: ad.error,
		hasADAuth: ad.hasAuth,
		tbUser: tb.user,
		tbError: tb.error,
		hasTBAuth: tb.hasAuth,
		traktUser: trakt.user,
		traktError: trakt.error,
		hasTraktAuth: trakt.hasAuth,
		isLoading: rd.loading,
	};
};

export const useDebridLogin = () => {
	const router = useRouter();

	return {
		loginWithRealDebrid: () => router.push('/realdebrid/login'),
		loginWithAllDebrid: () => router.push('/alldebrid/login'),
		loginWithTorbox: () => router.push('/torbox/login'),
	};
};
