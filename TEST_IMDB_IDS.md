# Test IMDb IDs for Debrid Media Manager

This document provides a comprehensive list of IMDb IDs that you can use to test various features of Debrid Media Manager. These IDs cover a range of movie and TV show types across different genres, years, and popularity levels.

## Movies

### Popular/Recent Movies

| Title | IMDb ID | Year |
|-------|---------|------|
| The Batman | tt1877830 | 2022 |
| Dune | tt1160419 | 2021 |
| Oppenheimer | tt15398776 | 2023 |
| Barbie | tt1517268 | 2023 |
| Spider-Man: No Way Home | tt10872600 | 2021 |
| Top Gun: Maverick | tt1745960 | 2022 |

### Classic Movies

| Title | IMDb ID | Year |
|-------|---------|------|
| The Godfather | tt0068646 | 1972 |
| The Shawshank Redemption | tt0111161 | 1994 |
| Pulp Fiction | tt0110912 | 1994 |
| Fight Club | tt0137523 | 1999 |
| The Matrix | tt0133093 | 1999 |

### Movies by Genre

| Title | IMDb ID | Year | Genre |
|-------|---------|------|-------|
| The Conjuring | tt1457767 | 2013 | Horror |
| Superbad | tt0829482 | 2007 | Comedy |
| John Wick | tt2911666 | 2014 | Action |
| Interstellar | tt0816692 | 2014 | Sci-Fi |
| Parasite | tt6751668 | 2019 | Foreign |

## TV Shows

### Popular/Recent Shows

| Title | IMDb ID | Seasons |
|-------|---------|---------|
| Stranger Things | tt4574334 | 1-4 |
| Game of Thrones | tt0944947 | 1-8 |
| The Last of Us | tt3581920 | 1 |
| Breaking Bad | tt0903747 | 1-5 |
| The Boys | tt1190634 | 1-4 |
| Wednesday | tt13443470 | 1 |

### TV Shows by Genre

| Title | IMDb ID | Seasons | Genre |
|-------|---------|---------|-------|
| The Office (US) | tt0386676 | 1-9 | Comedy |
| Better Call Saul | tt3032476 | 1-6 | Drama |
| Westworld | tt0475784 | 1-4 | Sci-Fi |
| House of the Dragon | tt11198330 | 1 | Fantasy |
| Narcos | tt2707408 | 1-3 | Crime |
| Rick and Morty | tt2861424 | 1-7 | Animation |

### Special TV Shows

| Title | IMDb ID | Seasons | Type |
|-------|---------|---------|------|
| Chernobyl | tt7366338 | 1 | Limited Series |
| Band of Brothers | tt0185906 | 1 | Limited Series |
| Attack on Titan | tt2560140 | 1-4 | Anime |
| The Queen's Gambit | tt10048342 | 1 | Limited Series |

## How to Use These IDs

You can use these IMDb IDs in several ways:

1. **Direct URL Navigation**
   - For movies: `/movie/[imdbId]` (e.g., `/movie/tt1877830`)
   - For TV shows: `/show/[imdbId]/[seasonNum]` (e.g., `/show/tt4574334/1`)

2. **Search**
   - Enter the IMDb ID in the search bar

3. **Testing API Endpoints**
   - Movie torrents: `/api/torrents/movie?imdbId=[imdbId]`
   - TV torrents: `/api/torrents/tv?imdbId=[imdbId]&seasonNum=[season]`

## Testing Shows with Multiple Seasons

For TV shows with multiple seasons, you can test different seasons to ensure your application handles various cases:

- **Shows with many seasons**: Game of Thrones (8 seasons) - tt0944947
- **Shows with long runs**: Grey's Anatomy (19+ seasons) - tt0413573
- **Animated shows with many seasons**: South Park (26+ seasons) - tt0121955

## Testing Edge Cases

- **Very recent releases**: Check if metadata and torrents are available
- **Very old content**: Test with classics to ensure compatibility
- **Foreign content**: Use Parasite (tt6751668) to test handling of non-English content
- **Anime**: Use Attack on Titan (tt2560140) to test specialized anime handling

This list provides a comprehensive set of test cases for ensuring your application works correctly across different types of media content.