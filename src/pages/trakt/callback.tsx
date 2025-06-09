import useLocalStorage from '@/hooks/localStorage';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function TraktCallbackPage() {
	const router = useRouter();
	const [_, setRefreshToken] = useLocalStorage<string>('trakt:refreshToken');
	const [_2, setAccessToken] = useLocalStorage<string>('trakt:accessToken');
	const [errorMessage, setErrorMessage] = useState('');
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const { code, error, error_description } = router.query;

		// Handle OAuth errors from Trakt
		if (error) {
			const errorMsg = `Trakt OAuth Error: ${error}${
				error_description ? ` - ${error_description}` : ''
			}`;
			console.error(errorMsg);
			setErrorMessage(errorMsg);
			setIsLoading(false);
			return;
		}

		if (!code) {
			setIsLoading(false);
			return;
		}

		const exchangeToken = async () => {
			try {
				console.log('Exchanging Trakt authorization code...');
				const response = await fetch(
					'/api/trakt/exchange?code=' +
						code +
						`&redirect=${window.location.origin}/trakt/callback`
				);

				const data = await response.json();

				if (!response.ok) {
					throw new Error(
						`HTTP ${response.status}: ${
							data.errorMessage || data.error || 'Unknown error'
						}`
					);
				}

				if (data.error) {
					throw new Error(`${data.error}: ${data.error_description || 'Unknown error'}`);
				}

				console.log('Trakt token exchange successful');
				setAccessToken(data.access_token, data.expires_in);
				setRefreshToken(data.refresh_token);
				router.push('/');
			} catch (err) {
				const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
				console.error('Trakt token exchange failed:', errorMsg);
				setErrorMessage(`Token exchange failed: ${errorMsg}`);
			} finally {
				setIsLoading(false);
			}
		};

		exchangeToken();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [router]);

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<div className="mx-auto mb-4 h-32 w-32 animate-spin rounded-full border-b-2 border-blue-500"></div>
					<p className="text-lg">Completing Trakt authentication...</p>
				</div>
			</div>
		);
	}

	if (errorMessage) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
					<h2 className="mb-2 text-xl font-semibold text-red-800">
						Authentication Failed
					</h2>
					<p className="mb-4 text-red-600">{errorMessage}</p>
					<button
						onClick={() => router.push('/')}
						className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
					>
						Return to Home
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				<p className="text-lg">Redirecting...</p>
			</div>
		</div>
	);
}
