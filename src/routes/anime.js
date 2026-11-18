const express = require('express');
const router = express.Router();
const provider = require('../providers');
const cache = require('../services/cache');
const { inBackground } = require('../services/priority');
const imdb = require('../services/imdb');
const dubs = require('../services/dubs');
const tmdb = require('../services/tmdb');
const artwork = require('../services/artwork');
const hianime = require('../services/hianime');
const streamProxy = require('../services/streamProxy');
const animerulz = require('../services/animerulz');

const TTL = {
  home: 30 * 60, // home rows refresh on their own every 30 minutes
  detail: 6 * 60 * 60,
  search: 15 * 60,
  schedule: 60 * 60,
  genres: 24 * 60 * 60,
};

const KEEP = {
  detail: 7 * 24 * 60 * 60,
  search: 24 * 60 * 60,
  schedule: 24 * 60 * 60,
  genres: 7 * 24 * 60 * 60,
};

// Serve-stale-while-refreshing: a visitor gets the last good answer instantly and
// never an error page just because an API is having a bad minute.
const fresh = (key, ttl, keep, loader) => cache.getFresh(key, ttl, keep, loader);
// A page served before all its TMDB posters arrived is refreshed on the next
// read (by then the posters are cached, so that refresh is quick).
const searchKey = (p) => `search:${JSON.stringify(p)}`;
const loadSearch = (p) =>
  fresh(searchKey(p), TTL.search, KEEP.search, () => provider.search(p)).then((r) => {
    if (r.postersPending) cache.markStale(searchKey(p));
    return r;
  });
const DEFAULT_BROWSE = { q: '', genre: '', type: '', status: '', order: '', dub: '', page: 1 };

const getDetail = async (id) => {
  const mem = cache.get(`detail:${id}`);
  if (mem) return mem;
  const disk = cache.snapshot.read(`detail_${id}`);
  if (disk) {
    cache.seed(`detail:${id}`, disk, KEEP.detail);
    inBackground(() =>
      provider.detail(id).then((freshData) => {
        if (freshData) {
          cache.set(`detail:${id}`, freshData, TTL.detail);
          cache.snapshot.write(`detail_${id}`, freshData);
        }
      })
    ).catch(() => {});
    return disk;
  }
  return fresh(`detail:${id}`, TTL.detail, KEEP.detail, async () => {
    const data = await provider.detail(id);
    if (data) cache.snapshot.write(`detail_${id}`, data);
    return data;
  });
};

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function handle(fn, cacheControl = null) {
  return async (req, res) => {
    try {
      if (cacheControl) res.set('Cache-Control', cacheControl);
      res.json(await fn(req, res));
    } catch (err) {
      console.error(`[api] ${req.originalUrl}: ${err.message}`);
      const status = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 502;
      res.status(status).json({ error: err.status === 400 ? err.message : 'Anime data is temporarily unavailable. Please try again shortly.' });
    }
  };
}

// Runs the loaders concurrently with safe fallback so one failing row never blanks the home page.
async function settle(entries) {
  const out = {};
  const results = await Promise.allSettled(
    entries.map(async ([key, loader]) => {
      try {
        const val = await loader();
        return { key, val };
      } catch (err) {
        console.warn(`[home] ${key} failed: ${err.message}`);
        return { key, val: [] };
      }
    })
  );
  for (const r of results) {
    if (r.status === 'fulfilled') {
      out[r.value.key] = r.value.val;
    }
  }
  return out;
}

async function buildHome() {
  const rows = await settle([
    ['trending', () => provider.trending(20)],
    ['seasonNow', () => provider.seasonNow(24)],
    ['topRated', () => provider.topRated(20)],
    ['popular', () => provider.popular(20)],
    ['upcoming', () => provider.upcoming(20)],
    ['movies', () => provider.movies(20)],
  ]);
  if (!Object.values(rows).some((r) => r.length)) throw new Error('All home rows failed');
  // Spotlight uses TMDB's backdrops and title logos.
  const candidates = [...rows.trending, ...rows.seasonNow]
    .filter((a, i, arr) => a.synopsis && arr.findIndex((b) => b.id === a.id) === i)
    .slice(0, 14);
  const spotlight = (await artwork.withArtwork(candidates))
    .filter((a) => a.backdrop || a.banner)
    .sort((a, b) => Boolean(b.backdrop) - Boolean(a.backdrop))
    .slice(0, 8);
  const partial = Object.values(rows).some((r) => !r.length);
  const home = { spotlight, ...rows, partial, updatedAt: new Date().toISOString() };
  if (partial) {
    // A row that failed (rate limit, outage) is retried in 2 minutes, not 30.
    setTimeout(() => inBackground(() => cache.load('home', TTL.home, buildHome, HOME_KEEP)).catch(() => {}), 120 * 1000).unref();
  } else {
    cache.snapshot.write('home', home);
  }
  return home;
}

// Visitors always get the home page instantly once it has been built once:
// it refreshes in the background every 30 minutes and is kept for a day.
const HOME_KEEP = 24 * 60 * 60;
const getHome = () => cache.getFresh('home', TTL.home, HOME_KEEP, buildHome);

// Called at startup: serve the last saved page right away, then rebuild it.
function warmUp() {
  const saved = cache.snapshot.read('home');
  if (saved) cache.seed('home', saved, HOME_KEEP);
  inBackground(() =>
    getHome()
      .catch((err) => console.warn(`[home] warm-up failed: ${err.message}`))
      // The first Browse page is the other page nearly everyone opens.
      .then(() => loadSearch(DEFAULT_BROWSE))
      .catch((err) => console.warn(`[browse] warm-up failed: ${err.message}`))
  );
}

router.get('/', (req, res) => res.json({ status: 'ok', name: 'AnimeVerse API' }));
router.get('/home', handle(() => getHome(), 'public, s-maxage=1800, stale-while-revalidate=86400'));

router.get(
  '/anime/:id',
  handle(async (req) => {
    const id = req.params.id;
    if (!/^(al)?\d+$/.test(id)) {
      const err = new Error('Bad id');
      err.status = 404;
      throw err;
    }
    const anime = await getDetail(id);
    const [imdbRating, art] = await Promise.all([
      imdb.enabled() ? imdb.lookup([anime.title, anime.titleRomaji], anime.year).catch(() => null) : null,
      artwork.artworkFor(anime).catch((err) => {
        console.warn(`[anime] artworkFor failed: ${err.message}`);
        return null;
      }),
    ]);
    const visuals = art || {};
    const isSeason = artwork.isSeasonEntry(anime.title, anime.titleRomaji) || (art && (art.isSeason || art.targetSeason > 1));

    if (art && (isSeason || (!artwork.SERIES_TYPES.has(anime.type) && art.tmdbKind === 'tv'))) {
      // It is a specific season or non-series TV entry:
      // Keep its own season cover (AniList anime.image or season-specific poster),
      // Prefer anime.banner if available (so sequel doesn't show Season 1's backdrop),
      // Drop series-wide season count and status so it doesn't show "2 Seasons | 20 Episodes | Airing".
      const seasonPoster = visuals.seasonPoster || visuals.tmdbPoster || anime.image;
      return {
        ...anime,
        ...visuals,
        image: seasonPoster,
        tmdbPoster: seasonPoster,
        banner: anime.banner || visuals.backdrop,
        backdrop: anime.banner || visuals.backdrop,
        backdropHd: anime.banner || visuals.backdropHd,
        seasonCount: null,
        episodeCount: anime.episodes || null,
        tmdbStatus: anime.status || null,
        imdb: imdbRating,
      };
    }
    // Main show entry (Season 1):
    // Use season 1 poster (visuals.seasonPoster) if available to avoid TMDB whole-show poster being hijacked by sequels,
    // otherwise fallback to visuals.tmdbPoster or anime.image.
    const mainPoster = visuals.seasonPoster || visuals.tmdbPoster || anime.image;
    return {
      ...anime,
      ...visuals,
      image: mainPoster,
      tmdbPoster: mainPoster,
      backdrop: visuals.backdrop || anime.banner,
      backdropHd: visuals.backdropHd || anime.banner,
      ...(art ? artwork.seriesFacts(art, anime) : {}),
      imdb: imdbRating,
    };
  }, 'public, s-maxage=3600, stale-while-revalidate=86400')
);

router.get(
  '/anime/:id/extras',
  handle(async (req) => {
    const id = req.params.id;
    // A failure is not cached as "no cast", so the next visit tries again.
    return fresh(`extras:${id}`, TTL.detail, KEEP.detail, () => provider.extras(id));
  }, 'public, s-maxage=3600, stale-while-revalidate=86400')
);

router.get(
  '/anime/:id/episodes',
  handle(async (req) => {
    const id = req.params.id;
    const anime = await getDetail(id);
    const detectedSeason = artwork.detectSeasonNumber ? artwork.detectSeasonNumber(anime.title, anime.titleRomaji) : 1;
    const season = Math.max(1, parseInt(req.query.season, 10) || detectedSeason || 1);
    const isAiring = !!anime.airing;
    const cacheTtl = isAiring ? 15 * 60 : TTL.detail; // 15 mins for airing titles to reflect newly released & dubbed episodes

    const cacheKey = `episodes:${id}:s${season}`;
    if (req.query.refresh === '1') {
      cache.store?.delete(cacheKey);
    }

    return cache.getOrSet(cacheKey, cacheTtl, async () => {
      const art = await artwork.artworkFor(anime);
      const tmdbShowId = art?.tmdbKind === 'tv' ? art.tmdbId : (await tmdb.findTmdbShow(anime.title, anime.titleRomaji, anime.year))?.id;
      let result = null;
      if (tmdbShowId) {
        const tmdbData = await tmdb.getTmdbShowData(tmdbShowId, season, anime);
        if (tmdbData && tmdbData.episodes.length > 0) {
          result = tmdbData;
        }
      }

      // Fallback: build structured episode list from anime detail
      if (!result) {
        let totalEp = anime.episodes && Number(anime.episodes) > 0 ? Number(anime.episodes) : (anime.type === 'Movie' ? 1 : 12);
        if (anime.airing || anime.status === 'Currently Airing' || anime.status === 'Releasing') {
          const nextEp = anime.nextEpisode?.episode ? Number(anime.nextEpisode.episode) : 0;
          if (nextEp > 1) {
            totalEp = Math.min(totalEp, nextEp - 1);
          }
        } else if (anime.status === 'Not yet aired' || anime.status === 'NOT_YET_RELEASED') {
          totalEp = 0;
        }

        const fallbackEpisodes = [];
        for (let i = 1; i <= totalEp; i++) {
          fallbackEpisodes.push({
            episode_number: i,
            season_number: season,
            name: `Episode ${i}`,
            overview: anime.synopsis ? (anime.synopsis.slice(0, 160) + '…') : '',
            still_path: anime.banner || anime.image,
            air_date: anime.aired || null,
            runtime: anime.duration ? parseInt(anime.duration, 10) : 24,
          });
        }

        result = {
          tmdbId: null,
          showName: anime.title,
          backdrop: anime.banner || null,
          seasons: [{ season_number: season, name: `Season ${season}`, episode_count: totalEp }],
          selectedSeason: season,
          episodes: fallbackEpisodes,
        };
      }

      // Fetch live HiAnime sub and dub availability
      let hianimeInfo = null;
      try {
        hianimeInfo = await hianime.getHiAnimeDubInfo({
          title: anime.title,
          romaji: anime.titleRomaji,
          season,
        });
      } catch (e) {
        console.warn('[episodes] HiAnime dub info fetch error:', e.message);
      }

      const dubCount = hianimeInfo?.dubCount ?? (anime.languages?.dub === 'full' ? result.episodes.length : (anime.languages?.dub === 'partial' ? 1 : 0));
      const subCount = hianimeInfo?.subCount ?? result.episodes.length;

      // Annotate each episode with hasDub and hasSub flags (Crunchyroll style)
      result.episodes.forEach((ep) => {
        ep.hasDub = dubCount > 0 && ep.episode_number <= dubCount;
        ep.hasSub = subCount > 0 ? (ep.episode_number <= subCount) : true;
      });

      result.dubCount = dubCount;
      result.subCount = subCount;

      return result;
    });
  }, 'public, s-maxage=1800, stale-while-revalidate=86400')
);

router.get(
  '/stream/resolve',
  handle(async (req) => {
    const title = (req.query.title || '').trim();
    if (!title) {
      const err = new Error('Missing title');
      err.status = 400;
      throw err;
    }
    const romaji = (req.query.romaji || '').trim();
    const season = Math.max(1, parseInt(req.query.season, 10) || 1);
    const episode = Math.max(1, parseInt(req.query.episode, 10) || 1);
    const mode = req.query.mode === 'dub' ? 'dub' : 'sub';

    const anilistId = (req.query.id || req.query.anilistId || '').trim();
    const serverPref = (req.query.server || '').trim().toLowerCase();
    const cacheKey = `stream:${anilistId || title}:${season}:${episode}:${mode}:${serverPref}`;
    if (req.query.refresh === '1') {
      cache.store?.delete(cacheKey);
    }
    const result = await cache.getOrSet(cacheKey, 60 * 60, async () => {
      let resolved = null;
      let sourceName = 'AnimeVerse (Fast Stream)';

      if (serverPref === 'fast') {
        // Direct HiAnime request
        resolved = await hianime.resolveStream({ title, romaji, season, episode, mode });
        sourceName = 'AnimeVerse (Fast Stream)';
      } else {
        // 1. Primary: AnimeRulz Multi-Audio Indian Server (in-band Hindi, English, Japanese, Tamil, Telugu)
        try {
          resolved = await animerulz.resolveAnimeRulzStream({ anilistId, title, episode, season });
          if (resolved?.masterUrl) {
            sourceName = resolved.source || 'AnimeVerse (Multi-Audio)';
          }
        } catch (err) {
          // Transparent fallback to HiAnime
        }

        // 2. Fallback: HiAnime Direct Resolver
        if (!resolved || !resolved.masterUrl) {
          resolved = await hianime.resolveStream({ title, romaji, season, episode, mode });
          sourceName = 'AnimeVerse (Fast Stream)';
        }
      }

      const ref = resolved.referer || 'https://zokoanime.video/';
      const proxiedMaster = `/api/stream/proxy?url=${encodeURIComponent(resolved.masterUrl)}&ref=${encodeURIComponent(ref)}&v=2`;
      const proxiedSubs = (resolved.subtitles || []).map((s) => ({
        ...s,
        src: `/api/stream/proxy?url=${encodeURIComponent(s.src)}&ref=${encodeURIComponent(ref)}&v=2`,
      }));
      const audioTracks = (resolved.audioTracks || []).map((track) => ({
        ...track,
        uri: track.uri
          ? `/api/stream/proxy?url=${encodeURIComponent(track.uri)}&ref=${encodeURIComponent(ref)}&v=2`
          : null,
      }));

      return {
        success: true,
        source: sourceName,
        mode: resolved.mode || mode,
        seasonNumber: resolved.seasonNumber || season,
        episodeNumber: resolved.episodeNumber || episode,
        streamUrl: proxiedMaster,
        rawMasterUrl: resolved.masterUrl,
        referer: ref,
        subtitles: proxiedSubs,
        audioTracks,
      };
    });

    // Asynchronously pre-warm master playlist and variants in memory so player gets them in 1ms
    if (result?.rawMasterUrl) {
      streamProxy.prewarmPlaylist(result.rawMasterUrl, result.referer).catch(() => {});
    }

    return result;
  })
);

router.get('/stream/proxy', (req, res) => {
  return streamProxy.handleProxy(req, res);
});

router.get(
  '/search',
  handle((req) => {
    const params = {
      q: (req.query.q || '').toString().slice(0, 100).trim(),
      genre: (req.query.genre || '').toString(),
      type: (req.query.type || '').toString(),
      status: (req.query.status || '').toString(),
      order: (req.query.order || '').toString(),
      dub: req.query.dub === '1' ? '1' : '',
      page: Math.max(1, Math.min(200, parseInt(req.query.page, 10) || 1)),
    };
    return loadSearch(params);
  }, 'public, s-maxage=900, stale-while-revalidate=3600')
);

router.get(
  '/schedule/:day',
  handle((req) => {
    const day = req.params.day.toLowerCase();
    if (!DAYS.includes(day)) {
      const err = new Error('Bad day');
      err.status = 404;
      throw err;
    }
    return fresh(`schedule:${day}`, TTL.schedule, KEEP.schedule, () => provider.schedule(day));
  }, 'public, s-maxage=3600, stale-while-revalidate=86400')
);

router.get(
  '/genres',
  handle(() => fresh('genres', TTL.genres, KEEP.genres, () => provider.genres()), 'public, s-maxage=86400, stale-while-revalidate=604800')
);

router.get('/status', (req, res) => {
  res.json({
    provider: provider.status(),
    dubs: dubs.status(),
    imdb: imdb.enabled() ? 'enabled' : 'disabled (set OMDB_API_KEY)',
    uptime: process.uptime(),
  });
});

module.exports = router;
module.exports.warmUp = warmUp;
