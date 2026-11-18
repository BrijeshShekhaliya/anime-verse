// ── AnimeRulz Multi-Audio Stream Resolver ────────────────────────────────────
// Resolves Multi-Audio streams (Hindi, English, Japanese, Tamil, Telugu)
// directly without an intermediary AWS proxy server.

const { parseHlsAudioTracks } = require('./hlsAudioTracks');

const ANIMERULZ_DOMAINS = [
  'https://animerulz.co.in',
  'https://animerulz.in',
];

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

let _pinnedDomain = ANIMERULZ_DOMAINS[0];
let _hasVerifiedThisSession = false;
let _verificationPromise = null;

const _anilistIdCache = new Map();
const _streamCache = new Map();
const CACHE_TTL = 90 * 60 * 1000;

function cleanAnimeTitle(title) {
  return String(title || '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .replace(/:\s*Season\s*\d+/i, '')
    .replace(/\s+Season\s+\d+/i, '')
    .replace(/:\s*Part\s*\d+/i, '')
    .replace(/\s+Part\s+\d+/i, '')
    .replace(/:\s*Court\s*\d+/i, '')
    .replace(/\s+Court\s+\d+/i, '')
    .trim();
}

async function getOrVerifyActiveDomain(force = false) {
  if (!force && _hasVerifiedThisSession && _pinnedDomain) {
    return _pinnedDomain;
  }
  if (_verificationPromise && !force) return _verificationPromise;

  _verificationPromise = (async () => {
    for (const domain of ANIMERULZ_DOMAINS) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3500);
        const res = await fetch(`${domain}/api/reanime/search?q=naruto`, {
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'application/json, text/plain, */*',
            Referer: `${domain}/`,
          },
          signal: ctrl.signal,
        }).finally(() => clearTimeout(timer));

        if (res.ok) {
          _pinnedDomain = domain;
          _hasVerifiedThisSession = true;
          return domain;
        }
      } catch {
        // Try next
      }
    }
    return _pinnedDomain || ANIMERULZ_DOMAINS[0];
  })().finally(() => {
    _verificationPromise = null;
  });

  return _verificationPromise;
}

async function resolveAnilistIdFromTitle(title, domain) {
  const clean = cleanAnimeTitle(title).toLowerCase();
  if (!clean) return null;
  if (_anilistIdCache.has(clean)) return _anilistIdCache.get(clean);

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${domain}/api/reanime/search?q=${encodeURIComponent(clean)}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json, text/plain, */*',
        Origin: domain,
        Referer: `${domain}/`,
        'Sec-Fetch-Site': 'same-origin',
        'X-Requested-With': 'XMLHttpRequest',
      },
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));

    if (res.ok) {
      const data = await res.json();
      const first = (data.results || []).find((r) => r && typeof r.anilist_id === 'number' && r.anilist_id > 0);
      if (first && first.anilist_id > 0) {
        _anilistIdCache.set(clean, first.anilist_id);
        return first.anilist_id;
      }
    }
  } catch {}
  return null;
}

async function resolveAniListIdViaGraphQL(title) {
  const clean = cleanAnimeTitle(title);
  if (!clean) return null;
  const key = clean.toLowerCase();
  if (_anilistIdCache.has(key)) return _anilistIdCache.get(key);

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const q = `query ($search: String) { Media(search: $search, type: ANIME, isAdult: false, sort: POPULARITY_DESC) { id } }`;
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: q, variables: { search: clean } }),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));

    if (res.ok) {
      const data = await res.json();
      const id = data?.data?.Media?.id;
      if (typeof id === 'number' && id > 0) {
        _anilistIdCache.set(key, id);
        return id;
      }
    }
  } catch {}
  return null;
}

function parsePlayerJsSubtitles(raw) {
  if (!raw || typeof raw !== 'string') return [];
  const items = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const subtitles = [];
  for (const item of items) {
    const match = item.match(/^\[([^\]]+)\](.*)$/);
    if (match) {
      const label = match[1].trim();
      const src = match[2].trim();
      if (src) {
        let lang = 'en';
        const lower = label.toLowerCase();
        if (lower.includes('english')) lang = 'en';
        else if (lower.includes('spanish')) lang = 'sp';
        else if (lower.includes('hindi')) lang = 'hi';
        else if (lower.includes('japanese')) lang = 'ja';
        else lang = lower.slice(0, 2);

        subtitles.push({
          label,
          lang,
          kind: 'subtitles',
          src,
          default: subtitles.length === 0 || lower.includes('english'),
        });
      }
    }
  }
  return subtitles;
}

async function resolveAnimeRulzStream({ anilistId, title, episode = 1, season = 1 }) {
  const domain = await getOrVerifyActiveDomain();
  let targetId = anilistId ? parseInt(String(anilistId).replace(/^al/, ''), 10) : null;

  if (!targetId || targetId <= 0) {
    if (title) {
      targetId = (await resolveAnilistIdFromTitle(title, domain)) || (await resolveAniListIdViaGraphQL(title));
    }
  }

  if (!targetId || targetId <= 0) {
    throw new Error('No valid AniList ID found for AnimeRulz');
  }

  const cacheKey = `${targetId}:${episode}`;
  const hit = _streamCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return hit.data;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  let streamRes = null;
  try {
    const res = await fetch(`${domain}/api/reanime/stream?anilist_id=${targetId}&episode=${episode}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json, text/plain, */*',
        Origin: domain,
        Referer: `${domain}/watch?anilist_id=${targetId}&ep=${episode}`,
        'Sec-Fetch-Site': 'same-origin',
        'X-Requested-With': 'XMLHttpRequest',
      },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    streamRes = await res.json();
  } finally {
    clearTimeout(timer);
  }

  const servers = Array.isArray(streamRes?.servers) ? streamRes.servers.filter(Boolean) : [];
  if (!servers.length) throw new Error('No servers available on AnimeRulz');

  const multiServer =
    servers.find((s) => /ravok\.buzz/.test(String(s.dataLink))) ||
    servers.find((s) => /\.m3u8/i.test(String(s.dataLink)));
  const dataLink = multiServer?.dataLink;
  if (!dataLink) throw new Error('No playable multi-audio server link on AnimeRulz');

  let masterM3u8 = null;
  let subtitles = [];
  let referer = `${domain}/`;

  if (dataLink.includes('ravok.buzz')) {
    const hashMatch = dataLink.match(/\/video\/([a-zA-Z0-9]+)/);
    const hash = hashMatch ? hashMatch[1] : null;

    if (hash) {
      try {
        const fetchCtrl = new AbortController();
        const fetchTimer = setTimeout(() => fetchCtrl.abort(), 4500);
        const postRes = await fetch(`https://ravok.buzz/player/index.php?data=${hash}&do=getVideo`, {
          method: 'POST',
          headers: {
            'User-Agent': USER_AGENT,
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            Referer: `https://ravok.buzz/video/${hash}`,
            Origin: 'https://ravok.buzz',
          },
          body: new URLSearchParams({ hash, r: `${domain}/` }).toString(),
          signal: fetchCtrl.signal,
        }).finally(() => clearTimeout(fetchTimer));

        if (postRes.ok) {
          const videoData = await postRes.json();
          masterM3u8 = videoData.videoSource || videoData.securedLink || null;
          referer = 'https://ravok.buzz/';
        }
      } catch {}
    }
  }

  if (!masterM3u8 && /\.m3u8/i.test(dataLink)) {
    masterM3u8 = dataLink;
  }

  if (!masterM3u8) {
    throw new Error('Could not extract master M3U8 from AnimeRulz server');
  }

  const isMultiAudio =
    dataLink.includes('ravok.buzz') ||
    multiServer?.dataType === 'indian' ||
    String(multiServer?.serverName || '').toLowerCase().includes('multi') ||
    String(multiServer?.serverName || '').toLowerCase().includes('hindi');

  const audioTracks = isMultiAudio
    ? [
        {
          id: 'hls-audio-0',
          name: 'Japanese',
          language: 'jpn',
          groupId: 'audio',
          uri: null,
          isDefault: false,
          isAutoselect: true,
          channels: null,
        },
        {
          id: 'hls-audio-1',
          name: 'Hindi',
          language: 'hin',
          groupId: 'audio',
          uri: null,
          isDefault: true,
          isAutoselect: true,
          channels: null,
        },
      ]
    : [
        {
          id: 'hls-audio-0',
          name: 'Original Audio',
          language: 'jpn',
          groupId: 'audio',
          uri: null,
          isDefault: true,
          isAutoselect: true,
          channels: null,
        },
      ];

  const streamData = {
    masterUrl: masterM3u8,
    referer,
    subtitles,
    audioTracks,
    mode: isMultiAudio ? 'multi' : 'sub',
    source: 'AnimeVerse (Multi-Audio)',
  };

  _streamCache.set(cacheKey, { ts: Date.now(), data: streamData });
  return streamData;
}

module.exports = {
  resolveAnimeRulzStream,
  cleanAnimeTitle,
  parsePlayerJsSubtitles,
  ANIMERULZ_DOMAINS,
};
