// Optional IMDb ratings through the OMDb API (free key: https://www.omdbapi.com/apikey.aspx).
// IMDb has no free public API, so this only runs when OMDB_API_KEY is set.
const { fetchJson } = require('./http');
const cache = require('./cache');

const KEY = process.env.OMDB_API_KEY;

function enabled() {
  return Boolean(KEY);
}

async function lookup(titles, year) {
  if (!KEY) return null;
  const candidates = [...new Set(titles.filter(Boolean))];
  const cacheKey = `imdb:${candidates.join('|')}:${year || ''}`;

  return cache.getOrSet(cacheKey, 24 * 60 * 60, async () => {
    for (const title of candidates) {
      for (const withYear of year ? [true, false] : [false]) {
        const params = new URLSearchParams({ apikey: KEY, t: title });
        if (withYear) params.set('y', year);
        try {
          const data = await fetchJson(`https://www.omdbapi.com/?${params}`, { timeoutMs: 6000 });
          if (data.Response === 'True' && data.imdbRating && data.imdbRating !== 'N/A') {
            return { rating: Number(data.imdbRating), votes: data.imdbVotes, id: data.imdbID };
          }
        } catch (err) {
          console.warn(`[imdb] ${err.message}`);
          return null;
        }
      }
    }
    return null;
  });
}

module.exports = { enabled, lookup };
