// ─── Vercel Serverless Catch-All API Handler ─────────────────────────────
// Handles all /api/* requests (e.g. /api/home, /api/status, /api/stream/resolve, /api/genres)
// directly within Vercel's native serverless environment.

const app = require('../server');

module.exports = (req, res) => {
  if (req.url) {
    const orig = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.headers['x-vercel-matched-path'] || req.originalUrl;
    if (orig && orig.startsWith('/api') && !orig.startsWith('/api/index') && !orig.startsWith('/api/[...path]')) {
      req.url = orig;
    } else if (!req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
  }
  return app(req, res);
};
