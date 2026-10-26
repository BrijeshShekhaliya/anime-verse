const TMDB_API_KEY = process.env.TMDB_API_KEY || '06bc3cabd1f2780a22c8e2e25d6f0f15';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

// In-memory cache for TMDB queries to avoid rate limits and unnecessary requests.
// Capped so it can't grow forever; identical requests in flight share one fetch.
const cache = new Map();
const inflight = new Map();
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours
const CACHE_MAX = 3000;

function remember(endpoint, data) {
  cache.delete(endpoint);
  cache.set(endpoint, { time: Date.now(), data });
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value); // oldest first
}

async function tmdbFetch(endpoint) {
  const hit = cache.get(endpoint);
  if (hit && Date.now() - hit.time < CACHE_TTL) return hit.data;
  if (inflight.has(endpoint)) return inflight.get(endpoint);

  const sep = endpoint.includes('?') ? '&' : '?';
  const url = `${TMDB_BASE}${endpoint}${sep}api_key=${TMDB_API_KEY}`;
  const promise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`TMDB responded with ${res.status}`);
      const data = await res.json();
      remember(endpoint, data);
      return data;
    } finally {
      clearTimeout(timer);
      inflight.delete(endpoint);
    }
  })();
  inflight.set(endpoint, promise);
  return promise;
}

// Lets a richer response (details with images appended) also answer the plain
// endpoint, e.g. "/tv/1429", so the episode list doesn't fetch the show again.
function seed(endpoint, data) {
  if (!cache.has(endpoint)) remember(endpoint, data);
}

// True only if air date is strictly in the future
function isUnreleased(airDate) {
  if (!airDate) return false;
  const target = new Date(`${airDate}T23:59:59Z`).getTime();
  return Date.now() < target;
}

// Search for a TV show or movie by title
async function findTmdbShow(title, titleRomaji, year) {
  const titlesToTry = [title, titleRomaji].filter(Boolean);
  for (const t of titlesToTry) {
    // Clean common anime suffixes for better matching
    const cleanTitle = t
      .replace(/\s*\(TV\)$/i, '')
      .replace(/\s*Season\s*\d+$/i, '')
      .replace(/\s*Part\s*\d+$/i, '')
      .replace(/:\s*Season\s*\d+/i, '')
      .trim();

    try {
      const query = encodeURIComponent(cleanTitle);
      const res = await tmdbFetch(`/search/tv?query=${query}`);
      if (res.results && res.results.length > 0) {
        // If year matches or first result
        const match = year
          ? res.results.find((r) => r.first_air_date && r.first_air_date.startsWith(String(year))) || res.results[0]
          : res.results[0];
        return match;
      }
    } catch (e) {
      console.warn(`[tmdb] Search error for "${cleanTitle}":`, e.message);
    }
  }
  return null;
}

// Fetch all seasons and episodes for a show
async function getTmdbShowData(tmdbId, seasonNum = 1, animeData = null) {
  try {
    const show = await tmdbFetch(`/tv/${tmdbId}`);
    let validSeasons = (show.seasons || [])
      .filter((s) => s.season_number > 0)
      .map((s) => ({
        season_number: s.season_number,
        name: s.name || `Season ${s.season_number}`,
        episode_count: s.episode_count,
        air_date: s.air_date,
      }));

    // If TMDB only has 1 season, check for TMDB episode groups or AniList virtual seasons
    let episodeGroup = null;
    if (validSeasons.length <= 1) {
      // 1. Try TMDB Episode Groups (e.g. Solo Leveling has a "Seasons" group splitting 25 eps into S1:12 and S2:13)
      try {
        const egRes = await tmdbFetch(`/tv/${tmdbId}/episode_groups`);
        if (egRes && egRes.results && egRes.results.length > 0) {
          const bestGroup =
            egRes.results.find((g) => g.type === 6 && g.group_count > 1) ||
            egRes.results.find((g) => (g.name || '').toLowerCase().includes('season') && g.group_count > 1) ||
            egRes.results.find((g) => g.group_count > 1);

          if (bestGroup) {
            const groupData = await tmdbFetch(`/tv/episode_group/${bestGroup.id}`);
            if (groupData && groupData.groups && groupData.groups.length > 1) {
              episodeGroup = groupData;
            }
          }
        }
      } catch (e) {
        console.warn(`[tmdb] Episode groups check error for ${tmdbId}:`, e.message);
      }
    }

    if (episodeGroup && episodeGroup.groups && episodeGroup.groups.length > 1) {
      const sortedGroups = [...episodeGroup.groups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      validSeasons = sortedGroups.map((g, idx) => ({
        season_number: idx + 1,
        name: g.name || `Season ${idx + 1}`,
        episode_count: (g.episodes || []).filter((ep) => !isUnreleased(ep.air_date)).length,
      }));

      const targetGroup = sortedGroups[seasonNum - 1] || sortedGroups[0];
      const targetEpisodes = (targetGroup.episodes || [])
        .filter((ep) => !isUnreleased(ep.air_date))
        .map((ep, idx) => ({
          episode_number: idx + 1,
          season_number: seasonNum,
          _tmdbAbsolute: ep.episode_number,
          name: ep.name || `Episode ${idx + 1}`,
          overview: ep.overview || '',
          still_path: ep.still_path ? `${IMG_BASE}/w500${ep.still_path}` : null,
          air_date: ep.air_date,
          runtime: ep.runtime,
        }));

      return {
        tmdbId,
        showName: show.name,
        backdrop: show.backdrop_path ? `${IMG_BASE}/w1280${show.backdrop_path}` : null,
        seasons: validSeasons,
        selectedSeason: seasonNum,
        episodes: targetEpisodes,
      };
    }

    // 2. AniList Virtual Seasons Fallback (when TMDB has 1 combined season but AniList has sequels)
    const sequels = animeData ? (
      animeData.family
        ? animeData.family.filter((e) => e.rel === 'SEQUEL' && (e.format === 'TV' || e.format === 'TV_SHORT' || e.format === 'TV Short'))
        : (animeData.relations || []).filter((r) => (r.relation === 'Sequel' || r.relation === 'SEQUEL') && (r.kind === 'anime' || !r.kind))
    ) : [];

    if (validSeasons.length <= 1 && sequels.length > 0 && animeData && animeData.episodes) {
      const virtualSeasons = [
        { season_number: 1, name: 'Season 1', episode_count: Number(animeData.episodes) },
        ...sequels.map((seq, i) => ({
          season_number: i + 2,
          name: `Season ${i + 2}`,
          episode_count: seq.episodes || 12,
        })),
      ];

      let rawEpisodes = [];
      try {
        const sData = await tmdbFetch(`/tv/${tmdbId}/season/1`);
        rawEpisodes = (sData.episodes || []).filter((ep) => !isUnreleased(ep.air_date));
      } catch {}

      let offset = 0;
      for (const s of virtualSeasons) {
        if (s.season_number < seasonNum) offset += s.episode_count || 0;
      }
      const thisCount = virtualSeasons.find((s) => s.season_number === seasonNum)?.episode_count || rawEpisodes.length;
      const sliced = rawEpisodes.slice(offset, offset + thisCount);

      const mappedEpisodes = (sliced.length > 0 ? sliced : rawEpisodes).map((ep, idx) => ({
        episode_number: idx + 1,
        season_number: seasonNum,
        _tmdbAbsolute: ep.episode_number,
        name: ep.name || `Episode ${idx + 1}`,
        overview: ep.overview || '',
        still_path: ep.still_path ? `${IMG_BASE}/w500${ep.still_path}` : null,
        air_date: ep.air_date,
        runtime: ep.runtime,
      }));

      return {
        tmdbId,
        showName: show.name,
        backdrop: show.backdrop_path ? `${IMG_BASE}/w1280${show.backdrop_path}` : null,
        seasons: virtualSeasons,
        selectedSeason: seasonNum,
        episodes: mappedEpisodes,
      };
    }

    // Fetch the requested season details
    let seasonEpisodes = [];
    try {
      const sData = await tmdbFetch(`/tv/${tmdbId}/season/${seasonNum}`);
      seasonEpisodes = (sData.episodes || [])
        .filter((ep) => !isUnreleased(ep.air_date))
        .map((ep) => ({
          episode_number: ep.episode_number,
          season_number: ep.season_number,
          name: ep.name || `Episode ${ep.episode_number}`,
          overview: ep.overview || '',
          still_path: ep.still_path ? `${IMG_BASE}/w500${ep.still_path}` : null,
          air_date: ep.air_date,
          runtime: ep.runtime,
        }));
    } catch (e) {
      console.warn(`[tmdb] Error fetching season ${seasonNum} for show ${tmdbId}:`, e.message);
    }

    return {
      tmdbId,
      showName: show.name,
      backdrop: show.backdrop_path ? `${IMG_BASE}/w1280${show.backdrop_path}` : null,
      seasons: validSeasons,
      selectedSeason: seasonNum,
      episodes: seasonEpisodes,
    };
  } catch (err) {
    console.error(`[tmdb] getTmdbShowData error:`, err.message);
    return null;
  }
}

module.exports = {
  tmdbFetch,
  seed,
  IMG_BASE,
  findTmdbShow,
  getTmdbShowData,
  isUnreleased,
};
