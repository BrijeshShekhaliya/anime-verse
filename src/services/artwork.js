// High-resolution artwork and series facts from TMDB, the way Streambert
// presents shows: clean backdrops (no text), transparent title logos, the
// series poster, season/episode counts, status and age rating. AniList banners
// are small 1900x400 crops, so TMDB is preferred whenever a match is found.
// Cost per title: one search + one details call (images and ratings appended).
const { tmdbFetch, seed, IMG_BASE } = require('./tmdb');
const cache = require('./cache');

const TTL = 24 * 60 * 60;

// "Black Clover Season 2", "Spy x Family Part 2", "AoT Final Season" -> series name.
function seriesTitle(title) {
  return String(title || '')
    .replace(/\s*\((TV|\d{4})\)$/i, '')
    .replace(/[:\s-]*(Season|Part|Cour)\s*\d+.*$/i, '')
    .replace(/[:\s-]*(The\s+)?Final\s+(Season|Chapters?).*$/i, '')
    .replace(/\s+(2nd|3rd|\dth)\s+Season.*$/i, '')
    .replace(/\s+(II|III|IV|V)$/i, '')
    .trim();
}

function score(result, year, wantedTitle) {
  let s = 0;
  if ((result.genre_ids || []).includes(16)) s += 4; // Animation
  if ((result.origin_country || []).includes('JP') || result.original_language === 'ja') s += 4;
  const date = result.first_air_date || result.release_date || '';
  if (year && date.startsWith(String(year))) s += 3;
  const name = (result.name || result.title || '').toLowerCase();
  if (name === wantedTitle.toLowerCase()) s += 3;
  s += Math.min(2, (result.popularity || 0) / 50);
  return s;
}

function mainTitles(title) {
  const noNumber = title.replace(/\s+\d{1,2}$/, '');
  const beforeBreak = title.split(/\s*[:：]\s*|\s+-\s+/)[0].trim();
  return [noNumber, beforeBreak].filter((t) => t !== title && t.length >= 4);
}

// Resolves to the match, or null when TMDB has no such title (cached as a miss).
// Throws when TMDB couldn't be reached at all, so an outage is never cached as "no match".
async function findMatch(titles, year, isMovie) {
  const kind = isMovie ? 'movie' : 'tv';
  let searched = 0;
  let failed = 0;
  // English title first, romaji only if that found nothing (and only if it differs).
  const queries = [...new Set(titles.map((t) => (isMovie ? t : seriesTitle(t))).filter(Boolean))];
  for (const title of queries) {
    searched += 1;
    try {
      const res = await tmdbFetch(`/search/${kind}?query=${encodeURIComponent(title)}`);
      const ranked = (res.results || [])
        .map((r) => ({ r, s: score(r, isMovie ? year : null, title) }))
        .filter((x) => x.s >= 6) // must look like Japanese animation
        .sort((a, b) => b.s - a.s);
      if (ranked.length) return { kind, item: ranked[0].r };
    } catch (err) {
      failed += 1;
      console.warn(`[artwork] search "${title}" failed: ${err.message}`);
    }
  }
  if (searched && failed === searched) throw new Error('TMDB unreachable');

  // Nothing under the full name: an arc, part or numbered sequel ("Jujutsu
  // Kaisen: Shimetsu Kaiyuu", "Kono Subarashii... 4", "MASHLE:...") is usually listed on TMDB
  // under its main show. Movies are left out: their own title is the only match.
  if (isMovie) return null;
  const shorter = [...new Set(queries.flatMap(mainTitles))].filter((q) => !queries.includes(q));
  let shortFailed = false;
  for (const q of shorter) {
    try {
      const res = await tmdbFetch(`/search/${kind}?query=${encodeURIComponent(q)}`);
      const wanted = q.toLowerCase();
      const best = (res.results || [])
        .filter((r) => q.length >= 12 || [r.name, r.original_name].some((n) => (n || '').toLowerCase().startsWith(wanted)))
        .map((r) => ({ r, s: score(r, null, q) }))
        .filter((x) => x.s >= 6)
        .sort((x, y) => y.s - x.s)[0];
      if (best) return { kind, item: best.r };
    } catch (err) {
      shortFailed = true;
      console.warn(`[artwork] shorter search "${q}" failed: ${err.message}`);
    }
  }
  // A search that failed isn't a real "no picture": don't cache it as one.
  if (shortFailed) throw new Error('TMDB unreachable');
  return null;
}

const TV_STATUS = { 'Returning Series': 'Airing', Ended: 'Ended', Canceled: 'Cancelled', 'In Production': 'In production', Planned: 'Planned' };

// US age rating (TV-MA, PG-13, ...) from the details call's appended data.
function ageRating(kind, d) {
  if (kind === 'tv') return (d.content_ratings?.results || []).find((r) => r.iso_3166_1 === 'US')?.rating || null;
  const us = (d.release_dates?.results || []).find((r) => r.iso_3166_1 === 'US');
  return us?.release_dates?.find((x) => x.certification)?.certification || null;
}

// "Black Clover Season 2", "AoT Final Season Part 2": an entry for one season.
// Judged by the shown title only, exactly as the mobile app does
// (animeverse-app/src/lib/artwork.ts), so both pick the same poster.
const isSeasonEntry = (title) => /\b(season|part|cour|final)\b|\b(2nd|3rd|\dth)\b/i.test(title || '');

// Which TMDB season a "Season 2" / "2nd Season" / "Final Season" entry is.
function seasonOf(title, seasons = []) {
  const n = String(title || '').match(/season\s*(\d+)/i)?.[1] || String(title || '').match(/(\d+)(?:st|nd|rd|th)\s+season/i)?.[1];
  if (n) return Number(n);
  if (/final\s+season/i.test(title)) return Math.max(0, ...seasons.map((s) => s.season_number)) || null;
  return null;
}

// The TMDB title an anime maps to. Cached, so cards, search and the detail
// page all share one lookup per show.
function matchFor(anime) {
  const titles = [...new Set([anime.title, anime.titleRomaji].filter(Boolean))];
  if (!titles.length) return Promise.resolve(null);
  const isMovie = anime.type === 'Movie';
  // Seasons of a show share one lookup. Films each get their own: "Kizumonogatari
  // Part 1" and "Part 2" are two different TMDB movies with different posters.
  const key = `match:${isMovie ? 'm' : 't'}:${(isMovie ? titles[0] : seriesTitle(titles[0])).toLowerCase()}`;
  return cache.getOrSet(key, TTL, () => findMatch(titles, anime.year, isMovie));
}

const SERIES_TYPES = new Set(['TV', 'TV Short', 'ONA']);

// Whole-series facts. Only for a show's main entry: a "Season 3" entry keeps its own.
const TV_FORMATS = new Set(['TV', 'TV_SHORT', 'TV Short']);

// Direct TV sequels, from list data (family) or detail data (relations).
function tvSequels(a) {
  if (a.family) return a.family.filter((e) => e.rel === 'SEQUEL' && TV_FORMATS.has(e.format));
  return (a.relations || []).filter((r) => r.relation === 'Sequel' && r.kind === 'anime' && TV_FORMATS.has(r.format));
}

function seriesFacts(art, a = {}) {
  const tmdb = art?.tmdbKind === 'tv' ? art : null;
  const sequels = tvSequels(a);
  const alSeasons = 1 + sequels.length;
  if (sequels.length && (!tmdb?.seasonCount || tmdb.seasonCount <= 1 || alSeasons > tmdb.seasonCount)) {
    const known = [a.episodes, ...sequels.map((x) => x.episodes)];
    const total = known.every(Boolean) ? known.reduce((n, x) => n + x, 0) : tmdb?.episodeCount || null;
    return { seasonCount: alSeasons, episodeCount: total, tmdbStatus: tmdb?.tmdbStatus || null };
  }
  return tmdb ? { seasonCount: tmdb.seasonCount, episodeCount: tmdb.episodeCount, tmdbStatus: tmdb.tmdbStatus } : {};
}

const posterUrl = (path, size = 'w342') => (path ? `${IMG_BASE}/${size}${path}` : null);

async function artworkFor(anime) {
  const titles = [anime.title, anime.titleRomaji].filter(Boolean);
  if (!titles.length) return null;
  const isMovie = anime.type === 'Movie';
  const baseTitle = (isMovie ? titles[0] : seriesTitle(titles[0])).toLowerCase();
  const seasonKey = isSeasonEntry(anime.title) ? (anime.title || '') : 'main';
  const key = `art:${isMovie ? 'm' : 't'}:${baseTitle}:${seasonKey}`;

  return cache.getOrSet(key, TTL, async () => {
    const match = await matchFor(anime);
    if (!match) return null;
    const { kind, item } = match;
    const appended = kind === 'tv' ? 'content_ratings' : 'release_dates';
    const details = await tmdbFetch(`/${kind}/${item.id}?append_to_response=images,${appended}&include_image_language=en,ja,null`);
    // The same response also answers the plain show endpoint the episode list uses.
    seed(`/${kind}/${item.id}`, details);
    const images = details.images || {};
    const seasons = (details.seasons || []).filter((x) => x.season_number > 0 && x.episode_count > 0);

    let posterPath = item.poster_path || details.poster_path;
    // A season's own entry gets that season's TMDB poster (the show's otherwise).
    if (kind === 'tv' && isSeasonEntry(anime.title)) {
      const n = seasonOf(anime.title, details.seasons || []);
      const season = n == null ? null : (details.seasons || []).find((s) => s.season_number === n);
      posterPath = season?.poster_path || posterPath;
    }

    // Banner and title logo: TMDB's default backdrop, its best English logo.
    const textless = (images.backdrops || [])
      .filter((b) => b.iso_639_1 === null && b.width >= 1280)
      .sort((a, b) => b.vote_average - a.vote_average || b.width - a.width);
    const backdropPath = details.backdrop_path || item.backdrop_path || textless[0]?.file_path;

    const logo = (images.logos || [])
      .filter((l) => l.iso_639_1 === 'en' && String(l.file_path).endsWith('.png'))
      .sort((a, b) => b.vote_average - a.vote_average)[0];

    const poster = posterPath ? posterUrl(posterPath, 'w500') : null;

    return {
      tmdbId: item.id,
      tmdbKind: kind,
      poster,
      tmdbPoster: poster,
      backdrop: backdropPath ? `${IMG_BASE}/w1280${backdropPath}` : null,
      backdropHd: backdropPath ? `${IMG_BASE}/original${backdropPath}` : null,
      logo: logo ? `${IMG_BASE}/w500${logo.file_path}` : null,
      logoAspect: logo ? logo.aspect_ratio : null,
      seasonCount: kind === 'tv' ? seasons.length || null : null,
      episodeCount: kind === 'tv' ? seasons.reduce((n, x) => n + x.episode_count, 0) || null : null,
      tmdbStatus: kind === 'tv' ? TV_STATUS[details.status] || details.status || null : null,
      contentRating: ageRating(kind, details),
    };
  }).catch(() => null);
}

// One poster rule for every page: a show's main entry, movies, and season entries
// all use the exact same high-quality TMDB poster that the detail page displays.
// Synchronizes cards across home, browse, related, and detail pages.
async function withPosters(items, { budgetMs = 0 } = {}) {
  const out = items.map((a) => (!isSeasonEntry(a.title) && SERIES_TYPES.has(a.type || a.format) ? { ...a, factsPending: true } : a));
  const landed = new Set();
  const jobs = items.map(async (a, i) => {
    try { await job(a, i); } finally { landed.add(i); }
  });
  async function job(a, i) {
    const isSeason = isSeasonEntry(a.title);
    const itemType = a.type || a.format;
    const match = await matchFor(a).catch(() => null);
    if (!match) return;

    // Use artworkFor to get the exact same poster, logo, and facts as the detail page
    const art = await artworkFor({ ...a, type: itemType }).catch(() => null);
    const chosenPoster = art?.poster || a.image2x || a.image;

    let facts = {};
    if (art && match.kind === 'tv' && SERIES_TYPES.has(itemType) && !isSeason) {
      facts = seriesFacts(art, a);
    }

    if (chosenPoster) {
      out[i] = {
        ...out[i],
        cover: a.image,
        image: chosenPoster,
        image2x: chosenPoster,
        ...facts,
        factsPending: false,
      };
    } else {
      out[i] = { ...out[i], ...facts, factsPending: false };
    }
  }
  let done = false;
  const all = Promise.all(jobs).then(() => { done = true; });
  if (budgetMs) await Promise.race([all, new Promise((r) => setTimeout(r, budgetMs))]);
  else await all;
  // A card whose TMDB answer hasn't landed yet is marked, so the page can show a
  // placeholder and fill it in (like the app), instead of an AniList cover first.
  const result = out.map((a, i) => (landed.has(i) ? a : { ...a, posterPending: true }));
  result.postersPending = !done; // caller can refresh once the lookups land
  return result;
}

// Adds artwork to a list without letting one slow lookup hold the rest up.
async function withArtwork(items, concurrency = 4) {
  const out = [...items];
  let next = 0;
  const worker = async () => {
    while (next < out.length) {
      const i = next++;
      const art = await artworkFor(out[i]);
      if (art) {
        out[i] = {
          ...out[i],
          backdrop: art.backdrop,
          backdropHd: art.backdropHd,
          logo: art.logo,
          logoAspect: art.logoAspect,
          contentRating: art.contentRating,
        };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, out.length) }, worker));
  return out;
}

function detectSeasonNumber(title, romaji = '') {
  const combined = `${title || ''} ${romaji || ''}`.trim();
  const m1 = combined.match(/\b(?:Season|Part|Cour)\s*(\d+)\b/i);
  if (m1) return parseInt(m1[1], 10);
  const m2 = combined.match(/\b(\d+)(?:st|nd|rd|th)(?:\s+Season)?\b/i);
  if (m2) return parseInt(m2[1], 10);
  const m3 = combined.match(/\b(?:Season|Part)?\s*(II|III|IV|V|VI|VII|VIII|IX|X)\b/i);
  if (m3 && m3[1]) {
    const roman = { II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
    if (roman[m3[1].toUpperCase()]) return roman[m3[1].toUpperCase()];
  }
  const m4 = combined.match(/[\s:_-]([2-9]|1[0-2])\s*$/i);
  if (m4) return parseInt(m4[1], 10);
  return 1;
}

module.exports = { artworkFor, withArtwork, withPosters, isSeasonEntry, seriesTitle, seriesFacts, SERIES_TYPES, detectSeasonNumber };
