// ── Vercel Serverless Function Entrypoint ────────────────────────────────────
// Executes the AnimeVerse full-stack Express API serverlessly on Vercel without
// requiring any external AWS / EC2 proxy backend.

const app = require('../server');

module.exports = (req, res) => {
  if (req.url) {
    if (req.url.startsWith('/api/index.js')) {
      const orig = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.originalUrl;
      if (orig && orig.startsWith('/api') && !orig.startsWith('/api/index.js')) {
        req.url = orig;
      }
    } else if (!req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
  }
  return app(req, res);
};
