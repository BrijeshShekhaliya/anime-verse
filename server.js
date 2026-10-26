const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');

const animeRoutes = require('./src/routes/anime');
const dubs = require('./src/services/dubs');

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

app.use('/api', animeRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Static files: browsers keep a copy and only re-download when the file changed
// (ETag check), so refreshes are fast but edits still show up immediately.
app.use(
  express.static(PUBLIC_DIR, {
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
      const vendor = path.basename(filePath) === 'hls.min.js';
      res.setHeader('Cache-Control', vendor ? 'public, max-age=604800' : 'no-cache');
    },
  })
);

// Client-side routes all serve the single-page app.
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

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
