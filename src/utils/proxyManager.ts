import getConfig from 'next/config';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { isBrowser } from './checks';

const { publicRuntimeConfig: config } = getConfig();

class ProxyManager {
	static workingProxies: string[] = [];
	static nonWorkingProxies: string[] = [];
	private myId: string;

	constructor() {
		this.myId = '';
		this.rerollProxy();
	}

	getWorkingProxy(): SocksProxyAgent {
		if (ProxyManager.workingProxies.length > 5) {
			const randomProxy =
				ProxyManager.workingProxies[
					Math.floor(Math.random() * ProxyManager.workingProxies.length)
				];
			return new SocksProxyAgent(
				`socks5h://${randomProxy}:damama@${process.env.PROXY || ''}`,
				{ timeout: parseInt(process.env.REQUEST_TIMEOUT!) }
			);
		} else {
			this.myId = Math.random().toString(36).substring(2);
			ProxyManager.workingProxies.push(this.myId);
			return new SocksProxyAgent(`socks5h://${this.myId}:damama@${process.env.PROXY || ''}`, {
				timeout: parseInt(process.env.REQUEST_TIMEOUT!),
			});
		}
	}

	rerollProxy() {
		if (this.myId) this.removeProxy(this.myId);
		if (ProxyManager.workingProxies.length > 5) {
			this.myId =
				ProxyManager.workingProxies[
					Math.floor(Math.random() * ProxyManager.workingProxies.length)
				];
		} else {
			this.myId = Math.random().toString(36).substring(2);
			ProxyManager.workingProxies.push(this.myId);
		}
		if (ProxyManager.nonWorkingProxies.includes(this.myId)) this.rerollProxy();
	}

	private removeProxy(proxyId: string) {
		const index = ProxyManager.workingProxies.indexOf(proxyId);
		if (index > -1) {
			ProxyManager.workingProxies.splice(index, 1);
		}
		ProxyManager.nonWorkingProxies.push(proxyId);
	}
}

/**
 * Determines the appropriate API URL to use based on the environment
 * In production browser environment, it uses the local proxy
 * In development or server-side, it uses the configured proxy or direct API URL
 *
 * @param apiBaseUrl - The base URL of the API (e.g., 'https://api.trakt.tv')
 * @param useProxy - Whether to use proxy in development (defaults to true)
 * @returns The appropriate URL to use for API requests
 */
export const getProxiedApiUrl = (apiBaseUrl: string, useProxy: boolean = true): string => {
	// In production browser environment, use the local proxy
	if (isBrowser() && process.env.NODE_ENV === 'production') {
		return `/api/localproxy?url=${encodeURIComponent(apiBaseUrl)}`;
	}

	// In development with proxy enabled
	if (useProxy && config.proxy) {
		// Replace #num# with random number for load balancing
		const proxyUrl = config.proxy.replace('#num#', Math.floor(Math.random() * 10).toString());
		return proxyUrl + apiBaseUrl;
	}

	// Direct API access (development without proxy or server-side in production)
	return apiBaseUrl;
};

/**
 * Gets the appropriate URL for Real-Debrid API
 */
export const getRealDebridApiUrl = (endpoint: string = '', useProxy: boolean = true): string => {
	const apiBaseUrl = 'https://api.real-debrid.com';
	const baseUrl = getProxiedApiUrl(apiBaseUrl, useProxy);
	return endpoint ? `${baseUrl}${endpoint}` : baseUrl;
};

/**
 * Gets the appropriate URL for AllDebrid API
 */
export const getAllDebridApiUrl = (endpoint: string = '', useProxy: boolean = true): string => {
	const apiBaseUrl = config.allDebridHostname;
	const baseUrl = getProxiedApiUrl(apiBaseUrl, useProxy);
	return endpoint ? `${baseUrl}${endpoint}` : baseUrl;
};

/**
 * Gets the appropriate URL for Trakt API
 */
export const getTraktApiUrl = (endpoint: string = '', useProxy: boolean = true): string => {
	const apiBaseUrl = 'https://api.trakt.tv';
	const baseUrl = getProxiedApiUrl(apiBaseUrl, useProxy);
	return endpoint ? `${baseUrl}${endpoint}` : baseUrl;
};

/**
 * Gets the appropriate URL for TorBox API
 */
export const getTorboxApiUrl = (endpoint: string = '', useProxy: boolean = true): string => {
	const apiBaseUrl = config.torboxHostname;
	const baseUrl = getProxiedApiUrl(apiBaseUrl, useProxy);
	return endpoint ? `${baseUrl}${endpoint}` : baseUrl;
};

export default ProxyManager;
