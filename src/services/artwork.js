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
  return null;
}

const TV_STATUS = { 'Returning Series': 'Airing', Ended: 'Ended', Canceled: 'Cancelled', 'In Production': 'In production', Planned: 'Planned' };

// US age rating (TV-MA, PG-13, ...) from the details call's appended data.
function ageRating(kind, d) {
  if (kind === 'tv') return (d.content_ratings?.results || []).find((r) => r.iso_3166_1 === 'US')?.rating || null;
  const us = (d.release_dates?.results || []).find((r) => r.iso_3166_1 === 'US');
  return us?.release_dates?.find((x) => x.certification)?.certification || null;
}

// "Black Clover Season 2", "AoT Final Season Part 2": an entry for one season,
// which keeps its own season cover instead of the series poster.
const isSeasonEntry = (title) => /\b(season|part|cour|final)\b|\b(2nd|3rd|\dth)\b/i.test(title || '');

// The TMDB title an anime maps to. Cached, so cards, search and the detail
// page all share one lookup per show.
function matchFor(anime) {
  const titles = [...new Set([anime.title, anime.titleRomaji].filter(Boolean))];
  if (!titles.length) return Promise.resolve(null);
  const isMovie = anime.type === 'Movie';
  const key = `match:${isMovie ? 'm' : 't'}:${seriesTitle(titles[0]).toLowerCase()}`;
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
  const key = `art:${isMovie ? 'm' : 't'}:${seriesTitle(titles[0]).toLowerCase()}`;

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

    // Same banner Streambert shows: TMDB's own default backdrop for the title.
    // Falls back to the best textless backdrop when TMDB has no default.
    const textless = (images.backdrops || [])
      .filter((b) => b.iso_639_1 === null && b.width >= 1280)
      .sort((a, b) => b.vote_average - a.vote_average || b.width - a.width);
    const backdropPath = details.backdrop_path || item.backdrop_path || textless[0]?.file_path;
    const logo = (images.logos || [])
      .filter((l) => l.iso_639_1 === 'en' && l.file_path.endsWith('.png'))
      .sort((a, b) => b.vote_average - a.vote_average)[0];

    return {
      tmdbId: item.id,
      tmdbKind: kind,
      backdrop: backdropPath ? `${IMG_BASE}/w1280${backdropPath}` : null,
      backdropHd: backdropPath ? `${IMG_BASE}/original${backdropPath}` : null,
      logo: logo ? `${IMG_BASE}/w500${logo.file_path}` : null,
      logoAspect: logo ? logo.aspect_ratio : null,
      tmdbPoster: posterUrl(item.poster_path || details.poster_path, 'w500'),
      seasonCount: kind === 'tv' ? seasons.length || null : null,
      episodeCount: kind === 'tv' ? seasons.reduce((n, x) => n + x.episode_count, 0) || null : null,
      tmdbStatus: kind === 'tv' ? TV_STATUS[details.status] || details.status || null : null,
      contentRating: ageRating(kind, details),
    };
  }).catch(() => null);
}

// One poster rule for every page: a show's main entry and its movies use the
// TMDB poster (as on the detail page and in Streambert); a season entry keeps
// its own cover. Uses only the cached TMDB search, no details call.
// All lookups run at once (one page is at most ~25). With `budgetMs`, the list
// is returned after that long even if some lookups are still running: those
// cards keep their AniList cover this time, and the lookup finishes in the
// background so the next view already has the TMDB poster.
async function withPosters(items, { budgetMs = 0 } = {}) {
  // A series' main entry is flagged until its series totals are known, so a card
  // never shows Season 1's own episode count where the page shows the series total.
  const out = items.map((a) => (!isSeasonEntry(a.title) && SERIES_TYPES.has(a.type) ? { ...a, factsPending: true } : a));
  const jobs = items.map(async (a, i) => {
    if (isSeasonEntry(a.title)) return;
    const match = await matchFor(a).catch(() => null);
    const poster = posterUrl(match?.item?.poster_path);
    if (poster) out[i] = { ...out[i], cover: a.image, image: poster, image2x: posterUrl(match.item.poster_path, 'w500') };
    // A series card shows the same facts as the series page (seasons, total
    // episodes, status). Same cached TMDB details the anime page uses.
    let facts = {};
    if (match?.kind === 'tv' && SERIES_TYPES.has(a.type)) facts = seriesFacts(await artworkFor(a), a);
    out[i] = { ...out[i], ...facts, factsPending: false };
  });
  let done = false;
  const all = Promise.all(jobs).then(() => { done = true; });
  if (budgetMs) await Promise.race([all, new Promise((r) => setTimeout(r, budgetMs))]);
  else await all;
  const result = [...out];
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
  const combined = `${title || ''} ${romaji || ''}`;
  const m1 = combined.match(/\b(?:Season|Part|Cour)\s*(\d+)\b/i);
  if (m1) return parseInt(m1[1], 10);
  const m2 = combined.match(/\b(\d+)(?:st|nd|rd|th)\s+Season\b/i);
  if (m2) return parseInt(m2[1], 10);
  const m3 = combined.match(/\b(?:Season|Part)\s*(II|III|IV|V|VI)\b/i);
  if (m3) {
    const roman = { II: 2, III: 3, IV: 4, V: 5, VI: 6 };
    return roman[m3[1].toUpperCase()] || 1;
  }
  return 1;
}

module.exports = { artworkFor, withArtwork, withPosters, isSeasonEntry, seriesTitle, seriesFacts, SERIES_TYPES, detectSeasonNumber };
