// ── Standalone HLS stream proxy ───────────────────────────────────────────────
// Serves only /api/stream/proxy (playlists, video segments, subtitles), so the
// video bytes can run on a VPS with plenty of bandwidth while the site and its
// API stay on Vercel. Point the site at it with STREAM_PROXY_BASE.
//
//   PORT              port to listen on (default 8080)
//   HOST              address to bind (default 0.0.0.0; use 127.0.0.1 behind Caddy/nginx)
//   ALLOWED_ORIGINS   comma-separated site origins the browser player runs on
//                     (default https://watchanimeverse.dpdns.org; "*" allows any)
//
// STREAM_PROXY_BASE is not needed here: playlists served from this server are
// rewritten to relative /api/stream/proxy URLs, which the player resolves
// against the playlist's own URL, i.e. back to this server.
//
// Run: node stream-server.js   (see the README, "Video proxy on a VPS")

const express = require('express');
const streamProxy = require('./src/services/streamProxy');

const DEFAULT_ORIGINS = 'https://watchanimeverse.dpdns.org';

function parseOrigins(value) {
  return String(value || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

function createApp({ allowedOrigins = parseOrigins(process.env.ALLOWED_ORIGINS || DEFAULT_ORIGINS) } = {}) {
  const anyOrigin = allowedOrigins.includes('*');
  const primaryOrigin = anyOrigin ? '*' : allowedOrigins[0] || '*';

  const app = express();
  app.disable('x-powered-by');
  app.disable('etag');

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
  });

  app.get('/health', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, uptime: Math.round(process.uptime()) });
  });

  app.get('/robots.txt', (req, res) => {
    res.type('text/plain').send('User-agent: *\nDisallow: /\n');
  });

  // Browsers send Origin on the player's requests (hls.js and the
  // crossorigin <video>/<track>). Another site's origin gets a 403 here, before
  // any video is fetched, so it cannot spend this server's bandwidth. Requests
  // without an Origin (native players, curl) are served as before.
  app.use('/api/stream/proxy', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && !anyOrigin && !allowedOrigins.includes(origin)) {
      return res.status(403).send('Origin not allowed');
    }
    res.locals.corsOrigin = anyOrigin ? '*' : origin || primaryOrigin;
    for (const [name, value] of Object.entries(streamProxy.corsHeaders(res))) res.setHeader(name, value);
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Max-Age', '86400');
      return res.status(204).end();
    }
    next();
  });

  app.get('/api/stream/proxy', (req, res) => streamProxy.handleProxy(req, res));

  app.use((req, res) => res.status(404).send('Not found'));

  return app;
}

if (require.main === module) {
  const PORT = Number(process.env.PORT) || 8080;
  const HOST = process.env.HOST || '0.0.0.0';
  const allowedOrigins = parseOrigins(process.env.ALLOWED_ORIGINS || DEFAULT_ORIGINS);

  const server = createApp({ allowedOrigins }).listen(PORT, HOST, (err) => {
    if (err) {
      console.error(`Could not start on ${HOST}:${PORT}: ${err.message}`);
      process.exit(1);
    }
    console.log(`[stream] Proxy listening on http://${HOST}:${PORT}`);
    console.log(`[stream] Allowed origins: ${allowedOrigins.join(', ')}`);
  });

  // Let systemd / Docker stop the server cleanly.
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      server.close(() => process.exit(0));
      server.closeIdleConnections?.();
      setTimeout(() => process.exit(0), 5000).unref();
    });
  }
}

module.exports = { createApp, parseOrigins };
