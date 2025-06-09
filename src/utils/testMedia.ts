import { AxiosError } from 'axios';
import { createHash } from 'crypto';
const axios = require('axios');

// Create an axios instance with a base URL
const apiClient = axios.create({
	baseURL: process.env.API_URL || 'http://localhost:3000',
});

// Sample test IDs for movies
const movieIds = {
	popular: [
		{ id: 'tt1877830', title: 'The Batman (2022)' },
		{ id: 'tt1160419', title: 'Dune (2021)' },
		{ id: 'tt15398776', title: 'Oppenheimer (2023)' },
		{ id: 'tt1517268', title: 'Barbie (2023)' },
		{ id: 'tt10872600', title: 'Spider-Man: No Way Home (2021)' },
	],
	classics: [
		{ id: 'tt0068646', title: 'The Godfather (1972)' },
		{ id: 'tt0111161', title: 'The Shawshank Redemption (1994)' },
		{ id: 'tt0110912', title: 'Pulp Fiction (1994)' },
	],
	genres: [
		{ id: 'tt1457767', title: 'The Conjuring (2013)', genre: 'Horror' },
		{ id: 'tt0829482', title: 'Superbad (2007)', genre: 'Comedy' },
		{ id: 'tt2911666', title: 'John Wick (2014)', genre: 'Action' },
		{ id: 'tt0816692', title: 'Interstellar (2014)', genre: 'Sci-Fi' },
		{ id: 'tt6751668', title: 'Parasite (2019)', genre: 'Foreign' },
	],
};

// Sample test IDs for TV shows with season numbers
const tvIds = {
	popular: [
		{ id: 'tt4574334', title: 'Stranger Things', seasons: [1, 2, 3, 4] },
		{ id: 'tt0944947', title: 'Game of Thrones', seasons: [1, 2, 3, 4, 5, 6, 7, 8] },
		{ id: 'tt3581920', title: 'The Last of Us', seasons: [1] },
		{ id: 'tt0903747', title: 'Breaking Bad', seasons: [1, 2, 3, 4, 5] },
	],
	genres: [
		{
			id: 'tt0386676',
			title: 'The Office (US)',
			seasons: [1, 2, 3, 4, 5, 6, 7, 8, 9],
			genre: 'Comedy',
		},
		{ id: 'tt3032476', title: 'Better Call Saul', seasons: [1, 2, 3, 4, 5, 6], genre: 'Drama' },
		{ id: 'tt0475784', title: 'Westworld', seasons: [1, 2, 3, 4], genre: 'Sci-Fi' },
	],
	special: [
		{ id: 'tt7366338', title: 'Chernobyl', seasons: [1], type: 'Limited Series' },
		{ id: 'tt0185906', title: 'Band of Brothers', seasons: [1], type: 'Limited Series' },
		{ id: 'tt2560140', title: 'Attack on Titan', seasons: [1, 2, 3, 4], type: 'Anime' },
	],
};

// Utility function to get authentication params
const getAuthParams = () => {
	// Generate a timestamp-based key and a simple hash for testing
	const key = `${Date.now()}`;
	// Create a simple token for testing purposes only
	const solution = createHash('md5').update(key).digest('hex').substring(0, 16);

	return { dmmProblemKey: key, solution };
};

// Test movie endpoint with one ID
const testMovieEndpoint = async (imdbId: string) => {
	try {
		const auth = getAuthParams();
		const url = `/api/torrents/movie?imdbId=${imdbId}&dmmProblemKey=${auth.dmmProblemKey}&solution=${auth.solution}&onlyTrusted=false&maxSize=0&page=0`;

		console.log(`Testing movie endpoint for ${imdbId}...`);
		const response = await apiClient.get(url);

		console.log(`Status: ${response.status}`);
		console.log(`Results found: ${response.data.results?.length || 0}`);
		return response.data;
	} catch (error) {
		const axiosError = error as AxiosError;
		console.error(`Error testing movie ${imdbId}:`, axiosError.message);
		if (axiosError.response) {
			console.error(`Status: ${axiosError.response.status}`);
			console.error(`Data:`, axiosError.response.data);
		}
		return null;
	}
};

// Test TV endpoint with one ID and season
const testTVEndpoint = async (imdbId: string, seasonNum: number) => {
	try {
		const auth = getAuthParams();
		const url = `/api/torrents/tv?imdbId=${imdbId}&seasonNum=${seasonNum}&dmmProblemKey=${auth.dmmProblemKey}&solution=${auth.solution}&onlyTrusted=false&maxSize=0&page=0`;

		console.log(`Testing TV endpoint for ${imdbId} Season ${seasonNum}...`);
		const response = await apiClient.get(url);

		console.log(`Status: ${response.status}`);
		console.log(`Results found: ${response.data.results?.length || 0}`);
		return response.data;
	} catch (error) {
		const axiosError = error as AxiosError;
		console.error(`Error testing TV ${imdbId} Season ${seasonNum}:`, axiosError.message);
		if (axiosError.response) {
			console.error(`Status: ${axiosError.response.status}`);
			console.error(`Data:`, axiosError.response.data);
		}
		return null;
	}
};

// Run a battery of tests across multiple media types
const runTestBattery = async () => {
	console.log('=== Starting Media API Test Battery ===');

	// Test 3 movies
	const movieSamples = [movieIds.popular[0], movieIds.classics[0], movieIds.genres[0]];

	for (const movie of movieSamples) {
		console.log(`\nTesting movie: ${movie.title} (${movie.id})`);
		await testMovieEndpoint(movie.id);
	}

	// Test 3 TV shows, one season each
	const tvSamples = [
		{ show: tvIds.popular[0], season: 1 },
		{ show: tvIds.genres[0], season: 1 },
		{ show: tvIds.special[0], season: 1 },
	];

	for (const tv of tvSamples) {
		console.log(`\nTesting TV show: ${tv.show.title} (${tv.show.id}) Season ${tv.season}`);
		await testTVEndpoint(tv.show.id, tv.season);
	}

	console.log('\n=== Test Battery Complete ===');
};

module.exports = {
	movieIds,
	tvIds,
	getAuthParams,
	testMovieEndpoint,
	testTVEndpoint,
	runTestBattery,
};
