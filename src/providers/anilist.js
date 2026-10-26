// AniList GraphQL — free, no key (https://docs.anilist.co). Used for banner art
// and as an automatic fallback whenever Jikan is down or rate-limited.
const { createThrottle } = require('../services/http');

const URL = 'https://graphql.anilist.co';
const throttle = createThrottle(250);

const MEDIA_FIELDS = `
  id idMal
  title { romaji english native }
  coverImage { extraLarge large color }
  bannerImage
  description(asHtml: false)
  averageScore meanScore popularity favourites
  episodes status format season seasonYear duration
  genres
  studios(isMain: true) { nodes { name } }
  trailer { id site }
  startDate { year month day }
  endDate { year month day }
  nextAiringEpisode { episode airingAt }
  externalLinks { site url type }
  rankings { rank type allTime }
  isAdult
  family: relations { edges { relationType node { id type format episodes } } }
`;

// Extra fields only fetched for a single title's page.
const DETAIL_FIELDS = `
  ${MEDIA_FIELDS}
  synonyms source countryOfOrigin hashtag siteUrl favourites
  allStudios: studios { edges { isMain node { name isAnimationStudio } } }
  tags { name rank isMediaSpoiler }
  relations { edges { relationType node { id idMal type format status episodes seasonYear isAdult title { english romaji } coverImage { large } } } }
  stats { scoreDistribution { score amount } statusDistribution { status amount } }
`;

// AniList allows a limited number of requests per minute and answers 429 when
// it's exceeded. The whole queue pauses until the limit resets, then retries,
// so a busy page loads a little slower instead of coming back half empty.
let pausedUntil = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(body) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const wait = pausedUntil - Date.now();
    if (wait > 0) await sleep(wait);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    let res;
    try {
      res = await fetch(URL, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'AnimeVerse/1.0' },
        body,
      });
    } finally {
      clearTimeout(timer);
    }
    const remaining = Number(res.headers.get('x-ratelimit-remaining'));
    const reset = Number(res.headers.get('x-ratelimit-reset'));
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after')) || 30;
      pausedUntil = Date.now() + Math.min(retryAfter, 65) * 1000;
      console.warn(`[anilist] rate limited; pausing ${Math.min(retryAfter, 65)}s`);
      continue;
    }
    // Nearly out of requests this minute: wait for the reset instead of hitting 429.
    if (Number.isFinite(remaining) && remaining <= 1 && reset) pausedUntil = reset * 1000 + 500;
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} for ${URL}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }
  const err = new Error('AniList rate limit');
  err.status = 429;
  throw err;
}

function query(q, variables = {}) {
  return throttle(() => post(JSON.stringify({ query: q, variables }))).then((res) => {
    if (res.errors?.length) throw new Error(res.errors[0].message);
    return res.data;
  });
}

const STATUS = {
  RELEASING: 'Currently Airing',
  FINISHED: 'Finished Airing',
  NOT_YET_RELEASED: 'Not yet aired',
  CANCELLED: 'Cancelled',
  HIATUS: 'On Hiatus',
};
const FORMAT = { TV: 'TV', TV_SHORT: 'TV Short', MOVIE: 'Movie', SPECIAL: 'Special', OVA: 'OVA', ONA: 'ONA', MUSIC: 'Music' };

function cleanDescription(text) {
  return (text || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\(Source:[^)]*\)/gi, '')
    .replace(/^\s*(\.{3}|…)\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatDate(d) {
  if (!d?.year) return null;
  return new Date(d.year, (d.month || 1) - 1, d.day || 1).toLocaleDateString('en-US', {
    year: 'numeric',
    month: d.month ? 'short' : undefined,
    day: d.day ? 'numeric' : undefined,
  });
}

function normalize(m) {
  const rated = (m.rankings || []).find((r) => r.type === 'RATED' && r.allTime);
  const start = formatDate(m.startDate);
  const end = formatDate(m.endDate);
  return {
    id: m.idMal ? String(m.idMal) : `al${m.id}`,
    malId: m.idMal || null,
    anilistId: m.id,
    title: m.title?.english || m.title?.romaji,
    titleRomaji: m.title?.romaji,
    titleJapanese: m.title?.native,
    image: m.coverImage?.large || m.coverImage?.extraLarge,
    image2x: m.coverImage?.extraLarge || null,
    banner: m.bannerImage || null,
    color: m.coverImage?.color || null,
    synopsis: cleanDescription(m.description),
    score: m.averageScore ? m.averageScore / 10 : m.meanScore ? m.meanScore / 10 : null,
    scoredBy: null,
    rank: rated?.rank || null,
    popularity: null,
    members: m.popularity || null,
    episodes: m.episodes || null,
    status: STATUS[m.status] || m.status,
    airing: m.status === 'RELEASING',
    type: FORMAT[m.format] || m.format,
    season: m.season ? m.season.toLowerCase() : null,
    year: m.seasonYear || m.startDate?.year || null,
    genres: m.genres || [],
    studios: (m.studios?.nodes || []).map((s) => s.name),
    duration: m.duration ? `${m.duration} min per ep` : null,
    ageRating: null,
    aired: start ? `${start}${end && end !== start ? ` to ${end}` : m.status === 'RELEASING' ? ' to ?' : ''}` : null,
    broadcast: null,
    trailer: m.trailer?.site === 'youtube' ? m.trailer.id : null,
    streaming: (m.externalLinks || []).filter((l) => l.type === 'STREAMING').map((l) => ({ name: l.site, url: l.url })),
    nextEpisode: m.nextAiringEpisode ? { episode: m.nextAiringEpisode.episode, airingAt: m.nextAiringEpisode.airingAt } : null,
    source: 'anilist',
    // Relations to other anime, used to group seasons into one series for free.
    family: (m.family?.edges || [])
      .filter((e) => e.node.type === 'ANIME')
      .map((e) => ({ rel: e.relationType, id: e.node.id, format: e.node.format, episodes: e.node.episodes || null })),
  };
}

const RELATION = {
  ADAPTATION: 'Adaptation', PREQUEL: 'Prequel', SEQUEL: 'Sequel', PARENT: 'Parent story', SIDE_STORY: 'Side story',
  CHARACTER: 'Shared characters', SUMMARY: 'Summary', ALTERNATIVE: 'Alternative version', SPIN_OFF: 'Spin-off',
  OTHER: 'Other', SOURCE: 'Source', COMPILATION: 'Compilation', CONTAINS: 'Contains',
};
const SOURCE = {
  ORIGINAL: 'Original', MANGA: 'Manga', LIGHT_NOVEL: 'Light novel', VISUAL_NOVEL: 'Visual novel', VIDEO_GAME: 'Video game',
  OTHER: 'Other', NOVEL: 'Novel', DOUJINSHI: 'Doujinshi', ANIME: 'Anime', WEB_NOVEL: 'Web novel', LIVE_ACTION: 'Live action',
  GAME: 'Game', COMIC: 'Comic', MULTIMEDIA_PROJECT: 'Multimedia project', PICTURE_BOOK: 'Picture book',
};
const WATCH_STATUS = { CURRENT: 'Watching', PLANNING: 'Plan to watch', COMPLETED: 'Completed', DROPPED: 'Dropped', PAUSED: 'On hold' };

function normalizeDetail(m) {
  const base = { ...normalize(m), image: m.coverImage?.extraLarge || m.coverImage?.large };
  const studioEdges = m.allStudios?.edges || [];
  return {
    ...base,
    studios: studioEdges.filter((e) => e.isMain).map((e) => e.node.name),
    producers: studioEdges.filter((e) => !e.isMain).map((e) => e.node.name),
    synonyms: m.synonyms || [],
    sourceMaterial: SOURCE[m.source] || null,
    country: m.countryOfOrigin || null,
    hashtag: m.hashtag || null,
    favourites: m.favourites || null,
    tags: (m.tags || []).filter((t) => !t.isMediaSpoiler).slice(0, 14).map((t) => ({ name: t.name, rank: t.rank })),
    relations: (m.relations?.edges || [])
      .filter((e) => !e.node.isAdult)
      .map((e) => ({
        relation: RELATION[e.relationType] || e.relationType,
        id: e.node.type === 'ANIME' ? (e.node.idMal ? String(e.node.idMal) : `al${e.node.id}`) : null,
        kind: e.node.type === 'ANIME' ? 'anime' : 'manga',
        title: e.node.title.english || e.node.title.romaji,
        image: e.node.coverImage?.large || null,
        format: FORMAT[e.node.format] || e.node.format,
        episodes: e.node.episodes || null,
        year: e.node.seasonYear || null,
      })),
    links: (m.externalLinks || []).map((l) => ({ name: l.site, url: l.url, type: l.type })),
    scoreDistribution: (m.stats?.scoreDistribution || []).sort((a, b) => a.score - b.score),
    statusDistribution: (m.stats?.statusDistribution || []).map((d) => ({ status: WATCH_STATUS[d.status] || d.status, amount: d.amount })),
    anilistUrl: m.siteUrl || null,
    malUrl: m.idMal ? `https://myanimelist.net/anime/${m.idMal}` : null,
  };
}

function currentSeason(date = new Date()) {
  const month = date.getMonth();
  const seasons = ['WINTER', 'WINTER', 'WINTER', 'SPRING', 'SPRING', 'SPRING', 'SUMMER', 'SUMMER', 'SUMMER', 'FALL', 'FALL', 'FALL'];
  return { season: seasons[month], year: date.getFullYear() };
}

function nextSeason() {
  const { season, year } = currentSeason();
  const order = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
  const i = order.indexOf(season);
  return i === 3 ? { season: 'WINTER', year: year + 1 } : { season: order[i + 1], year };
}

async function page(args, perPage = 20, pageNo = 1) {
  const keys = Object.keys(args);
  const varDefs = keys.map((k) => `$${k}: ${args[k].type}`).join(', ');
  const filters = keys.map((k) => `${k}: $${k}`).join(', ');
  const values = Object.fromEntries(keys.map((k) => [k, args[k].value]));
  const q = `query ($page: Int, $perPage: Int${varDefs ? `, ${varDefs}` : ''}) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage lastPage }
      media(type: ANIME, isAdult: false${filters ? `, ${filters}` : ''}) { ${MEDIA_FIELDS} }
    }
  }`;
  const data = await query(q, { page: pageNo, perPage, ...values });
  return {
    items: data.Page.media.map(normalize),
    hasNext: data.Page.pageInfo.hasNextPage,
    lastPage: data.Page.pageInfo.lastPage || 1,
  };
}

const sort = (value) => ({ sort: { type: '[MediaSort]', value } });

module.exports = {
  name: 'anilist',
  currentSeason,

  trending: (limit = 20) => page({ ...sort(['TRENDING_DESC', 'POPULARITY_DESC']), status: { type: 'MediaStatus', value: 'RELEASING' } }, limit).then((r) => r.items),
  seasonNow: (limit = 20) => {
    const { season, year } = currentSeason();
    return page({ ...sort(['POPULARITY_DESC']), season: { type: 'MediaSeason', value: season }, seasonYear: { type: 'Int', value: year } }, limit).then((r) => r.items);
  },
  topRated: (limit = 20) => page({ ...sort(['SCORE_DESC']), format_not: { type: 'MediaFormat', value: 'MUSIC' } }, limit).then((r) => r.items),
  upcoming: (limit = 20) => {
    const { season, year } = nextSeason();
    return page({ ...sort(['POPULARITY_DESC']), season: { type: 'MediaSeason', value: season }, seasonYear: { type: 'Int', value: year } }, limit).then((r) => r.items);
  },
  popular: (limit = 20) => page(sort(['POPULARITY_DESC']), limit).then((r) => r.items),
  movies: (limit = 20) => page({ ...sort(['SCORE_DESC']), format: { type: 'MediaFormat', value: 'MOVIE' } }, limit).then((r) => r.items),

  async detail(id) {
    const isAl = String(id).startsWith('al');
    const key = isAl ? 'id' : 'idMal';
    const data = await query(`query ($v: Int) { Media(${key}: $v, type: ANIME) { ${DETAIL_FIELDS} } }`, {
      v: Number(String(id).replace('al', '')),
    });
    return normalizeDetail(data.Media);
  },

  async characters(id) {
    const isAl = String(id).startsWith('al');
    const key = isAl ? 'id' : 'idMal';
    const data = await query(
      `query ($v: Int) { Media(${key}: $v, type: ANIME) {
        characters(sort: [ROLE, RELEVANCE], perPage: 12) {
          edges { role node { name { full } image { medium } } voiceActors(language: JAPANESE) { name { full } } }
        } } }`,
      { v: Number(String(id).replace('al', '')) }
    );
    return data.Media.characters.edges.map((e) => ({
      name: e.node.name.full,
      image: e.node.image?.medium,
      role: e.role === 'MAIN' ? 'Main' : 'Supporting',
      voiceActor: e.voiceActors?.[0]?.name?.full || null,
    }));
  },

  async recommendations(id) {
    const isAl = String(id).startsWith('al');
    const key = isAl ? 'id' : 'idMal';
    const data = await query(
      `query ($v: Int) { Media(${key}: $v, type: ANIME) {
        recommendations(sort: RATING_DESC, perPage: 12) { nodes { mediaRecommendation { id idMal isAdult title { english romaji } coverImage { extraLarge large } } } }
      } }`,
      { v: Number(String(id).replace('al', '')) }
    );
    return data.Media.recommendations.nodes
      .map((n) => n.mediaRecommendation)
      .filter((m) => m && !m.isAdult)
      .map((m) => ({
        id: m.idMal ? String(m.idMal) : `al${m.id}`,
        malId: m.idMal,
        title: m.title.english || m.title.romaji,
        image: m.coverImage.extraLarge || m.coverImage.large,
      }));
  },

  search({ q, genre, type, status, order, page: pageNo = 1, limit = 24 }) {
    const formats = { TV: 'TV', MOVIE: 'MOVIE', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'SPECIAL' };
    const statuses = { airing: 'RELEASING', finished: 'FINISHED', upcoming: 'NOT_YET_RELEASED' };
    const orders = { score: 'SCORE_DESC', popularity: 'POPULARITY_DESC', newest: 'START_DATE_DESC', title: 'TITLE_ENGLISH' };
    const args = sort([orders[order] || (q ? 'SEARCH_MATCH' : 'POPULARITY_DESC')]);
    if (q) args.search = { type: 'String', value: q };
    if (genre) args.genre = { type: 'String', value: genre };
    if (type && formats[type.toUpperCase()]) args.format = { type: 'MediaFormat', value: formats[type.toUpperCase()] };
    if (status && statuses[status]) args.status = { type: 'MediaStatus', value: statuses[status] };
    return page(args, limit, pageNo);
  },

  async genres() {
    const data = await query('{ GenreCollection }');
    return data.GenreCollection.filter((g) => g !== 'Hentai').map((g) => ({ id: g, name: g, count: null }));
  },

  async schedule(day) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    const target = new Date(now);
    target.setDate(now.getDate() + ((days.indexOf(day) - now.getDay() + 7) % 7));
    target.setHours(0, 0, 0, 0);
    const from = Math.floor(target.getTime() / 1000);
    const data = await query(
      `query ($from: Int, $to: Int) { Page(perPage: 50) {
        airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) {
          episode airingAt media { ${MEDIA_FIELDS} }
        } } }`,
      { from, to: from + 86400 }
    );
    return data.Page.airingSchedules
      .filter((s) => !s.media.isAdult)
      .map((s) => ({ ...normalize(s.media), nextEpisode: { episode: s.episode, airingAt: s.airingAt } }));
  },

  // Banner art and AniList IDs for MAL ids.
  async bannersByMalIds(ids) {
    if (!ids.length) return {};
    const data = await query(
      `query ($ids: [Int]) { Page(perPage: 50) { media(idMal_in: $ids, type: ANIME) { id idMal bannerImage coverImage { color } nextAiringEpisode { episode airingAt } } } }`,
      { ids: ids.map(Number) }
    );
    return Object.fromEntries(
      data.Page.media.map((m) => [String(m.idMal), { anilistId: m.id, banner: m.bannerImage, color: m.coverImage?.color, nextEpisode: m.nextAiringEpisode }])
    );
  },

  async resolveAnilistId(malId) {
    if (!malId) return null;
    try {
      const data = await query(
        `query ($id: Int) { Media(idMal: $id, type: ANIME) { id } }`,
        { id: Number(malId) }
      );
      return data?.Media?.id || null;
    } catch {
      return null;
    }
  },
};

// Low-level helpers shared with the franchise (season grouping) service.
module.exports.query = query;
module.exports.normalize = normalize;
module.exports.MEDIA_FIELDS = MEDIA_FIELDS;

// Cast and recommendations in a single request (the detail page needs both).
module.exports.extras = async function extras(id) {
  const isAl = String(id).startsWith('al');
  const data = await query(
    `query ($v: Int) { Media(${isAl ? 'id' : 'idMal'}: $v, type: ANIME) {
      characters(sort: [ROLE, RELEVANCE], perPage: 12) {
        edges { role node { name { full } image { medium } } voiceActors(language: JAPANESE) { name { full } } }
      }
      recommendations(sort: RATING_DESC, perPage: 12) {
        nodes { mediaRecommendation { ${MEDIA_FIELDS} } }
      }
    } }`,
    { v: Number(String(id).replace('al', '')) }
  );
  return {
    characters: data.Media.characters.edges.map((e) => ({
      name: e.node.name.full,
      image: e.node.image?.medium,
      role: e.role === 'MAIN' ? 'Main' : 'Supporting',
      voiceActor: e.voiceActors?.[0]?.name?.full || null,
    })),
    recommendations: data.Media.recommendations.nodes
      .map((n) => n.mediaRecommendation)
      .filter((m) => m && !m.isAdult)
      .map(normalize),
  };
};
