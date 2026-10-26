// One primary source per kind of data, with automatic fallback:
//
//   catalogue, details, scores, cast, schedule  AniList  (fallback: Jikan / MyAnimeList)
//   posters, backdrops, logos, season counts    TMDB     (fallback: AniList cover/banner)
//   English dub availability                    MAL-Dubs list (no network call per request)
//
// AniList answers in one GraphQL request what Jikan needs several for (banner,
// relations, fan stats, next episode, links), so it's the primary. Each source
// has a circuit breaker: after a failure it's skipped for a while (30s, doubling
// up to 10 min) and the next source answers instead, so a dead API never makes
// a visitor wait for its timeout. A 404 is a real answer and never falls back.
const jikan = require('./jikan');
const anilist = require('./anilist');
const dubs = require('../services/dubs');
const franchise = require('../services/franchise');
const art = require('../services/artwork');

const SOURCES = { anilist, jikan };
const PREFERRED = (process.env.PROVIDER || 'anilist').toLowerCase() === 'jikan' ? 'jikan' : 'anilist';
const ORDER = PREFERRED === 'jikan' ? ['jikan', 'anilist'] : ['anilist', 'jikan'];

const breakers = Object.fromEntries(ORDER.map((name) => [name, { failures: 0, openUntil: 0, lastError: null }]));
let lastSource = null;

function trip(name, err) {
  const b = breakers[name];
  b.failures += 1;
  b.lastError = err.message;
  const wait = Math.min(30 * 1000 * 2 ** (b.failures - 1), 10 * 60 * 1000);
  b.openUntil = Date.now() + wait;
  console.warn(`[source] ${name} failed (${err.message}); skipping it for ${Math.round(wait / 1000)}s`);
}

function heal(name) {
  const b = breakers[name];
  if (b.failures) console.log(`[source] ${name} is answering again`);
  b.failures = 0;
  b.openUntil = 0;
  b.lastError = null;
}

const healthyFirst = (names) => {
  const healthy = names.filter((n) => Date.now() >= breakers[n].openUntil);
  return healthy.length ? healthy : names; // all open: still try, in order
};

// Runs `method` on the first healthy source that has it.
async function run(method, args, { only } = {}) {
  const names = ORDER.filter((n) => typeof SOURCES[n][method] === 'function' && (!only || only === n));
  let lastErr = new Error(`No source can answer ${method}`);
  for (const name of healthyFirst(names)) {
    try {
      const result = await SOURCES[name][method](...args);
      heal(name);
      lastSource = name;
      return result;
    } catch (err) {
      if (err.status === 404) throw err;
      trip(name, err);
      lastErr = err;
    }
  }
  throw lastErr;
}

function withLanguages(item) {
  if (!item) return item;
  const languages = item.malId ? dubs.languagesFor(item.malId) : { audio: ['Japanese'], subtitles: ['English'], sub: true, dub: null };
  return { ...item, languages };
}

// mode: "series" shows each show once, "dedupe" keeps the listed season but
// drops repeats of the same show, null leaves the list alone.
async function list(method, mode, ...args) {
  let items = await run(method, args);
  if (mode) items = franchise.collapse(items, mode);
  return (await art.withPosters(items)).map(withLanguages);
}

// Jikan filters genres by numeric id; looked up once, and only if Jikan is used.
let jikanGenreIds = null;
async function jikanGenre(name) {
  if (!name) return name;
  if (!jikanGenreIds) {
    jikanGenreIds = Object.fromEntries((await jikan.genres()).map((g) => [g.name.toLowerCase(), g.id]));
  }
  return jikanGenreIds[name.toLowerCase()] || name;
}

module.exports = {
  status: () => ({
    order: ORDER,
    active: lastSource,
    sources: Object.fromEntries(
      Object.entries(breakers).map(([n, b]) => [n, { healthy: Date.now() >= b.openUntil, failures: b.failures, lastError: b.lastError }])
    ),
  }),

  trending: (limit) => list('trending', 'dedupe', limit),
  seasonNow: (limit) => list('seasonNow', 'dedupe', limit),
  topRated: (limit) => list('topRated', 'series', limit),
  upcoming: (limit) => list('upcoming', 'dedupe', limit),
  popular: (limit) => list('popular', 'series', limit),
  movies: (limit) => list('movies', null, limit),
  schedule: (day) => list('schedule', null, day),

  // One request to one source. AniList-only ids (no MAL entry) can only come from AniList.
  async detail(id) {
    const only = String(id).startsWith('al') ? 'anilist' : undefined;
    return withLanguages(await run('detail', [id], { only }));
  },

  // Cast + recommendations: one AniList request; Jikan needs two, so it's the fallback.
  async extras(id) {
    let characters;
    let recommendations;
    try {
      ({ characters, recommendations } = await run('extras', [id], { only: 'anilist' }));
    } catch (err) {
      if (String(id).startsWith('al') || err.status === 404) throw err;
      [characters, recommendations] = await Promise.all([
        jikan.characters(id).catch(() => []),
        jikan.recommendations(id).catch(() => []),
      ]);
    }
    const recs = await art.withPosters(franchise.collapse(recommendations, 'dedupe'));
    return { characters, recommendations: recs.map(withLanguages) };
  },

  async search(params) {
    let result;
    let lastErr;
    for (const name of healthyFirst(ORDER)) {
      try {
        const p = name === 'jikan' ? { ...params, genre: await jikanGenre(params.genre) } : params;
        result = await SOURCES[name].search(p);
        heal(name);
        lastSource = name;
        break;
      } catch (err) {
        trip(name, err);
        lastErr = err;
      }
    }
    if (!result) throw lastErr;
    // Catalogue search shows each series once; a movie-only search keeps every movie.
    const grouped = params.type === 'movie' ? result.items : franchise.collapse(result.items, 'series');
    // Don't hold the page for slow poster lookups (see withPosters).
    const withArt = await art.withPosters(grouped, { budgetMs: 200 });
    let items = withArt.map(withLanguages);
    if (params.dub === '1') items = items.filter((a) => a.languages.dub);
    return { ...result, items, postersPending: withArt.postersPending };
  },

  // Genre names are shared by both sources, so always list them by name.
  async genres() {
    return (await run('genres', [])).map((g) => g.name).sort();
  },
};
