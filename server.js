const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');

const animeRoutes = require('./src/routes/anime');
const dubs = require('./src/services/dubs');
const seo = require('./src/seo');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

app.disable('x-powered-by');

// Basic hardening headers for every response.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// gzip shrinks app.js / styles.css / JSON responses to roughly a fifth.
// Video segments from the stream proxy are already compressed, so skip them.
app.use(compression({ filter: (req, res) => !req.path.startsWith('/api/stream') && compression.filter(req, res) }));
app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (!req.originalUrl.startsWith('/api')) return;
    console.log(`[${new Date().toISOString().slice(11, 19)}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// API data is for the app (and for search engines rendering it), not for search results.
app.use('/api', (req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex');
  next();
});
app.use('/api', animeRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// robots.txt and the sitemaps are generated, so they always name the live site.
seo.mount(app);

// Static files: browsers keep a copy and only re-download when the file changed
// (ETag check), so refreshes are fast but edits still show up immediately.
// `index: false`: "/" is a rendered page like every other, not a static file.
app.use(
  express.static(PUBLIC_DIR, {
    index: false,
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
      const vendor = path.basename(filePath) === 'hls.min.js';
      res.setHeader('Cache-Control', vendor ? 'public, max-age=604800' : 'no-cache');
      // The Android app (public/download): always a download, never a page. Same headers as vercel.json.
      if (filePath.endsWith('.apk')) {
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
        res.setHeader('X-Robots-Tag', 'noindex');
      }
    },
  })
);

// Every page URL gets full server-rendered HTML (titles, structured data and
// content) for search engines; the app takes over in the browser as before.
app.use(seo.pageHandler);

if (require.main === module) {
  dubs.start();
  animeRoutes.warmUp();

  app.listen(PORT, (err) => {
    if (err) {
      console.error(`Could not start on port ${PORT}: ${err.message}`);
      console.error('Stop the other server using this port, or run with a different PORT.');
      process.exit(1);
    }
    console.log('=======================================================');
    console.log(' AnimeVerse is running');
    console.log(` Open:  http://localhost:${PORT}`);
    console.log(` API:   http://localhost:${PORT}/api/home`);
    console.log('=======================================================');
  });
} else {
  dubs.start();
  animeRoutes.warmUp();
}

module.exports = app;
