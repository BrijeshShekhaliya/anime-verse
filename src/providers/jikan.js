// Jikan v4 — free, unofficial MyAnimeList API (https://jikan.moe). No key needed.
// Limits: 3 requests/second and 60/minute, so every call goes through a throttle.
const { fetchJson, createThrottle } = require('../services/http');

const BASE = 'https://api.jikan.moe/v4';
const throttle = createThrottle(400);

function get(path, params = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
  const url = `${BASE}${path}${qs.toString() ? `?${qs}` : ''}`;
  return throttle(() => fetchJson(url, { timeoutMs: 7000 }));
}

function youtubeId(trailer) {
  if (!trailer) return null;
  if (trailer.youtube_id) return trailer.youtube_id;
  const match = /embed\/([\w-]{11})/.exec(trailer.embed_url || '');
  return match ? match[1] : null;
}

function normalize(a) {
  const img = a.images?.webp?.large_image_url || a.images?.jpg?.large_image_url || a.images?.jpg?.image_url;
  return {
    id: String(a.mal_id),
    malId: a.mal_id,
    title: a.title_english || a.title,
    titleRomaji: a.title,
    titleJapanese: a.title_japanese,
    image: img,
    banner: null,
    color: null,
    synopsis: (a.synopsis || '').replace(/\[Written by MAL Rewrite\]/g, '').trim(),
    score: a.score ?? null,
    scoredBy: a.scored_by ?? null,
    rank: a.rank ?? null,
    popularity: a.popularity ?? null,
    members: a.members ?? null,
    episodes: a.episodes ?? null,
    status: a.status || null,
    airing: Boolean(a.airing),
    type: a.type || null,
    season: a.season || null,
    year: a.year || a.aired?.prop?.from?.year || null,
    genres: [...(a.genres || []), ...(a.themes || []), ...(a.demographics || [])].map((g) => g.name),
    studios: (a.studios || []).map((s) => s.name),
    duration: a.duration || null,
    ageRating: a.rating || null,
    aired: a.aired?.string || null,
    broadcast: a.broadcast?.string && a.broadcast.string !== 'Unknown' ? a.broadcast.string : null,
    trailer: youtubeId(a.trailer),
    streaming: (a.streaming || []).map((s) => ({ name: s.name, url: s.url })),
    nextEpisode: null,
    source: 'jikan',
  };
}

// Jikan sometimes returns the same title twice across pages.
function uniq(list) {
  const seen = new Set();
  return list.filter((a) => !seen.has(a.mal_id) && seen.add(a.mal_id));
}

async function list(path, params) {
  const res = await get(path, { sfw: 'true', ...params });
  return {
    items: uniq(res.data || []).map(normalize),
    hasNext: Boolean(res.pagination?.has_next_page),
    lastPage: res.pagination?.last_page || 1,
  };
}

module.exports = {
  name: 'jikan',

  probe: () => fetchJson(`${BASE}/anime/1`, { timeoutMs: 6000 }),

  trending: (limit = 20) => list('/top/anime', { filter: 'airing', limit }).then((r) => r.items),
  seasonNow: (limit = 20) => list('/seasons/now', { limit }).then((r) => r.items),
  topRated: (limit = 20) => list('/top/anime', { limit }).then((r) => r.items),
  upcoming: (limit = 20) => list('/seasons/upcoming', { limit }).then((r) => r.items),
  popular: (limit = 20) => list('/top/anime', { filter: 'bypopularity', limit }).then((r) => r.items),
  movies: (limit = 20) => list('/top/anime', { type: 'movie', limit }).then((r) => r.items),

  async detail(id) {
    const res = await get(`/anime/${id}/full`);
    const a = res.data;
    return {
      ...normalize(a),
      synonyms: (a.title_synonyms || []).filter(Boolean),
      sourceMaterial: a.source && a.source !== 'Unknown' ? a.source : null,
      producers: (a.producers || []).map((p) => p.name),
      licensors: (a.licensors || []).map((p) => p.name),
      favourites: a.favorites ?? null,
      relations: (a.relations || []).flatMap((r) =>
        (r.entry || []).map((e) => ({
          relation: r.relation,
          id: e.type === 'anime' ? String(e.mal_id) : null,
          kind: e.type,
          title: e.name,
          image: null,
          format: null,
          year: null,
        }))
      ),
      links: [
        ...(a.streaming || []).map((l) => ({ name: l.name, url: l.url, type: 'STREAMING' })),
        ...(a.external || []).map((l) => ({ name: l.name, url: l.url, type: 'INFO' })),
      ],
      openings: a.theme?.openings || [],
      endings: a.theme?.endings || [],
      malUrl: a.url || `https://myanimelist.net/anime/${a.mal_id}`,
    };
  },

  async characters(id) {
    const res = await get(`/anime/${id}/characters`);
    return (res.data || []).slice(0, 12).map((c) => {
      const va = (c.voice_actors || []).find((v) => v.language === 'Japanese');
      return {
        name: c.character?.name,
        image: c.character?.images?.webp?.image_url || c.character?.images?.jpg?.image_url,
        role: c.role,
        voiceActor: va?.person?.name || null,
      };
    });
  },

  async recommendations(id) {
    const res = await get(`/anime/${id}/recommendations`);
    return (res.data || []).slice(0, 12).map((r) => ({
      id: String(r.entry.mal_id),
      malId: r.entry.mal_id,
      title: r.entry.title,
      image: r.entry.images?.webp?.large_image_url || r.entry.images?.jpg?.large_image_url,
    }));
  },

  search({ q, genre, type, status, order, page = 1, limit = 24 }) {
    const orderMap = { score: 'score', popularity: 'members', newest: 'start_date', title: 'title' };
    return list('/anime', {
      q,
      genres: genre,
      type: type ? type.toLowerCase() : undefined,
      status: status ? { airing: 'airing', finished: 'complete', upcoming: 'upcoming' }[status] : undefined,
      order_by: orderMap[order] || (q ? undefined : 'members'),
      sort: order === 'title' ? 'asc' : 'desc',
      page,
      limit,
    });
  },

  async genres() {
    const res = await get('/genres/anime', { filter: 'genres' });
    return (res.data || []).map((g) => ({ id: String(g.mal_id), name: g.name, count: g.count }));
  },

  async schedule(day) {
    const res = await get('/schedules', { filter: day, sfw: 'true', limit: 25 });
    return uniq(res.data || []).map(normalize);
  },
};
