// ─── Vercel Serverless Function Entrypoint ──────────────────────────────────
// Executes the AnimeVerse full-stack Express API serverlessly on Vercel without
// requiring any external AWS / EC2 proxy backend.

const app = require('../server');

module.exports = (req, res) => {
  if (req.url) {
    const orig = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.headers['x-vercel-matched-path'] || req.originalUrl;
    if (orig && orig.startsWith('/api') && !orig.startsWith('/api/index') && !orig.includes('[...')) {
      req.url = orig;
    } else if (!req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
  }
  return app(req, res);
};
