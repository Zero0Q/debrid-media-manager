#!/usr/bin/env ts-node

/**
 * Command-line test runner for Debrid Media Manager API endpoints
 *
 * Usage:
 *   npm run test:media -- movie tt1877830
 *   npm run test:media -- tv tt4574334 1
 *   npm run test:media -- battery
 */

const mediaTests = require('./testMedia');
const crypto = require('crypto');

// Create test auth params without requiring browser APIs
const generateTestToken = () => {
	// Generate a timestamp-based key and a simple hash for testing
	const key = `${Date.now()}`;
	// Create a simple token for testing purposes only
	const solution = crypto.createHash('md5').update(key).digest('hex').substring(0, 16);

	return { dmmProblemKey: key, solution };
};

async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.log(`
Usage:
  npm run test:media -- movie <imdbId>
  npm run test:media -- tv <imdbId> <seasonNum>
  npm run test:media -- battery
  npm run test:media -- list

Examples:
  npm run test:media -- movie tt1877830
  npm run test:media -- tv tt4574334 1
  npm run test:media -- battery
    `);
		process.exit(0);
	}

	// Set base URL for API calls
	const baseUrl = process.env.API_URL || 'http://localhost:3000';
	console.log(`Using API base URL: ${baseUrl}`);

	const command = args[0];

	if (command === 'list') {
		console.log('\n=== Available Movie IDs ===');

		console.log('\nPopular Movies:');
		mediaTests.movieIds.popular.forEach((m) => console.log(`- ${m.title} (${m.id})`));

		console.log('\nClassic Movies:');
		mediaTests.movieIds.classics.forEach((m) => console.log(`- ${m.title} (${m.id})`));

		console.log('\nGenre Movies:');
		mediaTests.movieIds.genres.forEach((m) =>
			console.log(`- ${m.title} (${m.id}) [${m.genre}]`)
		);

		console.log('\n=== Available TV Show IDs ===');

		console.log('\nPopular Shows:');
		mediaTests.tvIds.popular.forEach((t) =>
			console.log(`- ${t.title} (${t.id}) - Seasons: ${t.seasons.join(', ')}`)
		);

		console.log('\nGenre Shows:');
		mediaTests.tvIds.genres.forEach((t) =>
			console.log(`- ${t.title} (${t.id}) - Seasons: ${t.seasons.join(', ')} [${t.genre}]`)
		);

		console.log('\nSpecial Shows:');
		mediaTests.tvIds.special.forEach((t) =>
			console.log(`- ${t.title} (${t.id}) - Seasons: ${t.seasons.join(', ')} [${t.type}]`)
		);

		process.exit(0);
	}

	if (command === 'movie') {
		if (args.length < 2) {
			console.error('Error: IMDb ID required for movie test');
			process.exit(1);
		}

		const imdbId = args[1];
		console.log(`Testing movie endpoint for ${imdbId}...`);

		try {
			await mediaTests.testMovieEndpoint(imdbId);
		} catch (error) {
			console.error('Test failed:', error);
		}
	} else if (command === 'tv') {
		if (args.length < 3) {
			console.error('Error: Both IMDb ID and season number required for TV show test');
			process.exit(1);
		}

		const imdbId = args[1];
		const seasonNum = parseInt(args[2], 10);

		if (isNaN(seasonNum)) {
			console.error('Error: Season number must be a valid number');
			process.exit(1);
		}

		console.log(`Testing TV endpoint for ${imdbId} Season ${seasonNum}...`);

		try {
			await mediaTests.testTVEndpoint(imdbId, seasonNum);
		} catch (error) {
			console.error('Test failed:', error);
		}
	} else if (command === 'battery') {
		console.log('Running test battery...');
		await mediaTests.runTestBattery();
	} else {
		console.error('Unknown command:', command);
		process.exit(1);
	}
}

main().catch(console.error);
