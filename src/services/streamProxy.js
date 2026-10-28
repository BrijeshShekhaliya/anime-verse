// ── Stream Proxy Service ──────────────────────────────────────────────────────
// Proxies .m3u8 playlists, .ts segments, and subtitle files with proper Referer
// headers and CORS headers so native HTML5 / hls.js can play video ad-free.

const https = require('https');
const http = require('http');
const { assertPublicUrl } = require('./hianime');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAX_PLAYLIST_BYTES = 5 * 1024 * 1024;

const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 300, keepAliveMsecs: 60000, timeout: 15000 });
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 300, keepAliveMsecs: 60000, timeout: 15000 });

// In-memory cache for parsed and rewritten playlists to eliminate redundant round trips
const _playlistCache = new Map();
const PLAYLIST_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCachedPlaylist(url) {
  const item = _playlistCache.get(url);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    _playlistCache.delete(url);
    return null;
  }
  return item.data;
}

function setCachedPlaylist(url, data) {
  if (_playlistCache.size > 1000) {
    const oldestKey = _playlistCache.keys().next().value;
    if (oldestKey) _playlistCache.delete(oldestKey);
  }
  _playlistCache.set(url, { data, expiresAt: Date.now() + PLAYLIST_CACHE_TTL });
}

function proxiedUrl(targetUrl, ref) {
  return `/api/stream/proxy?url=${encodeURIComponent(targetUrl)}${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`;
}

function rewritePlaylist(text, playlistUrl, ref) {
  const abs = (u) => new URL(u, playlistUrl).href;
  return text
    .split(/\r?\n/)
    .map((line) => {
      const t = line.trim();
      if (!t) return line;
      if (t.startsWith('#')) {
        // Rewrite URI attributes in tags like #EXT-X-KEY or #EXT-X-MEDIA
        return line.replace(/URI="([^"]+)"/g, (_, u) => `URI="${proxiedUrl(abs(u), ref)}"`);
      }
      // Line is a segment or sub-playlist URL
      return proxiedUrl(abs(t), ref);
    })
    .join('\n');
}

async function handleProxy(req, res, hops = 0) {
  const target = req.query.url;
  const ref = req.query.ref || 'https://zokoanime.video/';

  if (!target) {
    return res.status(400).send('Missing url parameter');
  }

  // Fast-path: serve cached playlist instantly without outbound latency
  const isPlaylistFast = /\.m3u8(\?|$)/i.test(target);
  if (isPlaylistFast && !req.headers['range']) {
    const cached = getCachedPlaylist(target);
    if (cached) {
      res.writeHead(200, {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Accept, Origin, Content-Type',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
        'Cache-Control': 'public, max-age=1800',
        'X-Content-Type-Options': 'nosniff',
      });
      return res.end(cached);
    }
  }

  let targetUrl;
  try {
    targetUrl = await assertPublicUrl(target);
  } catch (err) {
    return res.status(403).send('Forbidden: ' + err.message);
  }

  const lib = targetUrl.protocol === 'https:' ? https : http;
  const headers = {
    'User-Agent': USER_AGENT,
    Referer: ref,
    Accept: '*/*',
    'Accept-Encoding': 'identity',
  };

  if (req.headers['range']) {
    headers['Range'] = req.headers['range'];
  }

  const proxyReq = lib.request(
    {
      hostname: targetUrl.hostname,
      port: targetUrl.port || undefined,
      path: targetUrl.pathname + targetUrl.search,
      method: 'GET',
      headers,
      agent: lib === https ? httpsAgent : httpAgent,
    },
    (proxyRes) => {
      const status = proxyRes.statusCode || 502;

      // Handle redirects
      if (status >= 300 && status < 400 && proxyRes.headers.location && hops < 8) {
        proxyRes.resume();
        const nextUrl = new URL(proxyRes.headers.location, target).href;
        req.query.url = nextUrl;
        return handleProxy(req, res, hops + 1);
      }

      const contentType = String(proxyRes.headers['content-type'] || '');
      const isPlaylist =
        /\.m3u8(\?|$)/i.test(targetUrl.pathname + targetUrl.search) ||
        /mpegurl/i.test(contentType);

      // CORS headers for browser player
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Accept, Origin, Content-Type');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

      if (isPlaylist && status === 200) {
        const chunks = [];
        let size = 0;
        proxyRes.on('data', (c) => {
          size += c.length;
          if (size > MAX_PLAYLIST_BYTES) {
            proxyReq.destroy();
            return;
          }
          chunks.push(c);
        });
        proxyRes.on('end', () => {
          if (size > MAX_PLAYLIST_BYTES) {
            return res.status(502).send('Playlist too large');
          }
          const text = Buffer.concat(chunks).toString('utf8');
          let output = text;
          try {
            if (text.trimStart().startsWith('#EXTM3U')) {
              output = rewritePlaylist(text, target, ref);
              setCachedPlaylist(target, output);
            }
          } catch {
            return res.status(502).send('Failed to parse playlist');
          }

          res.writeHead(200, {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Cache-Control': 'public, max-age=1800',
            'X-Content-Type-Options': 'nosniff',
          });
          res.end(output);
        });
        proxyRes.on('error', () => {
          if (!res.headersSent) res.status(502).send('Proxy error');
        });
        return;
      }

      // Media chunk or subtitle or direct binary stream
      const passHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Accept, Origin, Content-Type',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
        'X-Content-Type-Options': 'nosniff',
      };
      for (const h of [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'last-modified',
        'etag',
      ]) {
        if (proxyRes.headers[h]) passHeaders[h] = proxyRes.headers[h];
      }

      res.writeHead(status, passHeaders);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    if (!res.headersSent) res.status(502).send('Proxy connection failed: ' + err.message);
  });
  proxyReq.setTimeout(25000, () => {
    proxyReq.destroy();
  });
  res.on('close', () => {
    proxyReq.destroy();
  });
  proxyReq.end();
}

async function fetchAndRewritePlaylist(targetUrlStr, ref) {
  const cached = getCachedPlaylist(targetUrlStr);
  if (cached) return cached;

  let targetUrl;
  try {
    targetUrl = await assertPublicUrl(targetUrlStr);
  } catch {
    return null;
  }

  const lib = targetUrl.protocol === 'https:' ? https : http;
  return new Promise((resolve) => {
    const req = lib.request(
      {
        hostname: targetUrl.hostname,
        port: targetUrl.port || undefined,
        path: targetUrl.pathname + targetUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          Referer: ref,
          Accept: '*/*',
        },
        agent: lib === https ? httpsAgent : httpAgent,
        timeout: 10000,
      },
      (proxyRes) => {
        if (proxyRes.statusCode !== 200) {
          proxyRes.resume();
          return resolve(null);
        }
        const chunks = [];
        let size = 0;
        proxyRes.on('data', (c) => {
          size += c.length;
          if (size <= MAX_PLAYLIST_BYTES) chunks.push(c);
        });
        proxyRes.on('end', () => {
          try {
            const text = Buffer.concat(chunks).toString('utf8');
            if (text.trimStart().startsWith('#EXTM3U')) {
              const output = rewritePlaylist(text, targetUrlStr, ref);
              setCachedPlaylist(targetUrlStr, output);
              resolve(output);
              return;
            }
          } catch {}
          resolve(null);
        });
        proxyRes.on('error', () => resolve(null));
      }
    );
    req.on('error', () => resolve(null));
    req.end();
  });
}

// Pre-warms master playlist and its child variant playlists immediately in parallel
async function prewarmPlaylist(masterUrl, ref) {
  if (!masterUrl) return;
  try {
    const masterOutput = await fetchAndRewritePlaylist(masterUrl, ref);
    if (!masterOutput) return;

    // Find all variant playlist URLs inside master
    const lines = masterOutput.split(/\r?\n/);
    const variantUrls = [];
    for (const line of lines) {
      const t = line.trim();
      if (t && !t.startsWith('#') && t.includes('/api/stream/proxy?url=')) {
        try {
          const match = t.match(/url=([^&]+)/);
          if (match) {
            variantUrls.push(decodeURIComponent(match[1]));
          }
        } catch {}
      }
    }

    if (variantUrls.length > 0) {
      await Promise.allSettled(variantUrls.map((u) => fetchAndRewritePlaylist(u, ref)));
    }
  } catch (err) {
    console.warn('[prewarm] Error prewarming playlist:', err.message);
  }
}

module.exports = {
  handleProxy,
  prewarmPlaylist,
};
